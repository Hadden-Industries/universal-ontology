/** Reconcile Git's complete JSON inventory with policy and native tool selection.
 * This read-only gate never parses product JSON, runs tool CLIs, or writes files.
 * ESLint owns syntax/rules, Prettier owns formatting, and consumers own semantics.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { join, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import json from "@eslint/json";
import Ajv from "ajv";
import * as prettier from "prettier";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const JSON_SUFFIX = /\.(?:json|jsonc|json5|jsonld|jsonl|ndjson|sarif)$/iu;
const FORMAT_OPTIONS = Object.freeze({
  parser: "json-stringify",
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  printWidth: 80,
  trailingComma: "none",
});
// Policy structure is local and closed. No remote references, defaults or coercion.
const validatePolicy = new Ajv({ strict: true, allErrors: true }).compile({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "files"],
  properties: {
    schemaVersion: { const: 1 },
    files: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "path",
          "class",
          "owner",
          "lintProfile",
          "format",
          "formatContract",
          "validation",
        ],
        properties: {
          path: { type: "string", minLength: 1 },
          class: { enum: ["authored", "producer", "preserved"] },
          owner: { type: "string", pattern: "\\S" },
          lintProfile: { enum: ["control", "data"] },
          format: { type: "boolean" },
          formatContract: { enum: ["prettier-json", "producer-json-body"] },
          validation: { type: "string", pattern: "\\S" },
          preserveReason: { type: "string", pattern: "\\S" },
        },
      },
    },
  },
});

/** Reject unsafe path identities before asking native tools to resolve them. */
function assertLiteralPath(path) {
  if (
    isAbsolute(path) ||
    /[\\:*?[\]{}!()]/u.test(path) ||
    [...path].some(
      (character) =>
        character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
    ) ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    !JSON_SUFFIX.test(path)
  ) {
    throw new Error(`Nonliteral JSON policy path: ${path}`);
  }
}

/** Inspect ancestors as well as the leaf: a symlinked directory also escapes writes. */
function assertRegularFile(root, path, mode) {
  if (mode !== "100644" && mode !== "100755")
    throw new Error(`Nonregular Git JSON entry: ${path}`);
  let current = root;
  const parts = path.split("/");
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = lstatSync(current);
    if (
      stat.isSymbolicLink() ||
      (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
    )
      throw new Error(`Nonregular JSON path: ${path}`);
  }
  const resolved = relative(realpathSync(root), realpathSync(current));
  if (
    isAbsolute(resolved) ||
    resolved === ".." ||
    resolved.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  )
    throw new Error(`JSON path leaves repository: ${path}`);
}

/** Enforce exact classification and parity with effective native ESLint/Prettier decisions. */
export async function checkJsonInventory({ root = ROOT } = {}) {
  root = resolve(root);
  const policyText = new TextDecoder("utf-8", { fatal: true }).decode(
    readFileSync(join(root, ".json-quality.json")),
  );
  // Bootstrap with explicit native rules: a policy/config mistake cannot disable its own syntax check.
  const policyLinter = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.json"],
        plugins: { json },
        language: "json/json",
        rules: {
          "json/no-duplicate-keys": "error",
          "json/no-unsafe-values": "error",
          "json/no-unnormalized-keys": ["error", { form: "NFC" }],
        },
      },
    ],
  });
  const [policyLint] = await policyLinter.lintText(policyText, {
    filePath: ".json-quality.json",
  });
  if (policyLint.errorCount || policyLint.warningCount)
    throw new Error(
      `Invalid JSON policy: ${JSON.stringify(policyLint.messages)}`,
    );
  const policy = JSON.parse(policyText);
  if (!validatePolicy(policy))
    throw new Error(
      `Invalid JSON policy structure: ${JSON.stringify(validatePolicy.errors)}`,
    );
  const records = new Map();
  for (const file of policy.files) {
    assertLiteralPath(file.path);
    if (records.has(file.path))
      throw new Error(`Duplicate JSON classification: ${file.path}`);
    if (
      file.class === "authored"
        ? !file.format || file.formatContract !== "prettier-json"
        : file.format || !file.preserveReason || file.lintProfile !== "data"
    )
      throw new Error(`Conflicting JSON classification: ${file.path}`);
    if (!file.path.endsWith(".json"))
      throw new Error(`Unqualified JSON dialect: ${file.path}`);
    records.set(file.path, file);
  }
  const self = records.get(".json-quality.json");
  if (!self || self.class !== "authored" || self.lintProfile !== "control")
    throw new Error("JSON policy must classify itself as an authored control.");
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
  const tracked = new Map();
  const folded = new Set();
  for (const entry of git(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)) {
    const tab = entry.indexOf("\t");
    const path = entry.slice(tab + 1);
    if (!JSON_SUFFIX.test(path)) continue;
    const [mode, , stage] = entry.slice(0, tab).split(" ");
    assertLiteralPath(path);
    if (stage !== "0" || tracked.has(path))
      throw new Error(`Unmerged JSON entry: ${path}`);
    if (folded.has(path.toLowerCase()))
      throw new Error(`Case-colliding JSON path: ${path}`);
    folded.add(path.toLowerCase());
    tracked.set(path, mode);
  }
  for (const path of git(["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter((path) => JSON_SUFFIX.test(path)))
    throw new Error(
      `Untracked JSON candidate requires classification and staging: ${path}`,
    );
  if (!tracked.size) throw new Error("Expected JSON inventory is empty.");
  for (const path of tracked.keys())
    if (!records.has(path)) throw new Error(`Unclassified JSON path: ${path}`);
  for (const path of records.keys())
    if (!tracked.has(path))
      throw new Error(`Stale JSON classification: ${path}`);
  const linter = new ESLint({
    cwd: root,
    overrideConfigFile: join(root, "eslint.config.js"),
  });
  let formatted = 0,
    linted = 0;
  for (const [path, file] of records) {
    assertRegularFile(root, path, tracked.get(path));
    const absolute = join(root, path);
    const config = await linter.calculateConfigForFile(absolute);
    {
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(absolute));
      if (
        !config ||
        config.language !== json.languages.json ||
        config.linterOptions.noInlineConfig !== true
      )
        throw new Error(
          `Wrong native JSON language or inline controls: ${path}`,
        );
      for (const rule of ["json/no-duplicate-keys", "json/no-unsafe-values"])
        if (config.rules[rule]?.[0] !== 2)
          throw new Error(`Required JSON rule disabled: ${path}: ${rule}`);
      const normalization = config.rules["json/no-unnormalized-keys"];
      if (
        file.lintProfile === "control"
          ? normalization?.[0] !== 2 || normalization[1]?.form !== "NFC"
          : normalization?.[0] > 0
      )
        throw new Error(`Wrong JSON normalization scope: ${path}`);
      linted++;
    }
    const info = await prettier.getFileInfo(absolute, {
      ignorePath: join(root, ".prettierignore"),
      resolveConfig: false,
    });
    if (info.ignored === file.format)
      throw new Error(`Prettier JSON selection disagrees with policy: ${path}`);
    {
      const options = await prettier.resolveConfig(absolute, {
        editorconfig: true,
      });
      for (const [key, expected] of Object.entries(FORMAT_OPTIONS))
        if (options?.[key] !== expected)
          throw new Error(`Wrong JSON formatter option: ${path}: ${key}`);
      if (file.format) formatted++;
    }
  }
  if (!formatted || !linted)
    throw new Error("Expected native JSON selection is empty.");
  return {
    tracked: tracked.size,
    linted,
    formatted,
    preserved: tracked.size - formatted,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.length !== 2)
    throw new Error("JSON inventory takes no CLI arguments.");
  try {
    const result = await checkJsonInventory();
    process.stdout.write(
      `JSON inventory: ${result.tracked} classified; ${result.linted} linted; ${result.formatted} formattable; ${result.preserved} protected.\n`,
    );
  } catch (error) {
    process.stderr.write(`JSON inventory failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
