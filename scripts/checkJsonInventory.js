/** Reconcile Git's complete JSON inventory and native tool configuration.
 * This gate never writes JSON. ESLint owns syntax/rules; consumers own semantics.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { join, relative, resolve, isAbsolute, sep } from "node:path";
import { ESLint } from "eslint";
import json from "@eslint/json";
import * as prettier from "prettier";
import {
  JSON_ROOT,
  JSON_SUFFIX,
  readJsonPolicy,
  jsonRules,
  jsonFormatOptions,
  decodeJsonBytes,
} from "./jsonQuality.js";

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
  )
    throw new Error(`Nonliteral JSON policy path: ${path}`);
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
    resolved.startsWith(`..${sep}`)
  )
    throw new Error(`JSON path leaves repository: ${path}`);
}

/** Return one validated context for all operations in this invocation. */
export async function inspectJsonInventory({ root = JSON_ROOT } = {}) {
  root = resolve(root);
  const policy = await readJsonPolicy(root);
  const formatOptions = await jsonFormatOptions(root);
  const records = new Map();
  for (const file of policy.files) {
    assertLiteralPath(file.path);
    if (records.has(file.path))
      throw new Error(`Duplicate JSON classification: ${file.path}`);
    if (
      file.class === "authored"
        ? !file.allowFormatWrites || file.formatContract !== "prettier-json"
        : file.allowFormatWrites ||
          !file.preserveReason ||
          file.lintProfile !== "data"
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
  let formatted = 0;
  for (const [path, file] of records) {
    assertRegularFile(root, path, tracked.get(path));
    const absolute = join(root, path);
    decodeJsonBytes(readFileSync(absolute));
    const config = await linter.calculateConfigForFile(absolute);
    if (
      !config ||
      config.language !== json.languages.json ||
      config.linterOptions.noInlineConfig !== true
    )
      throw new Error(`Wrong native JSON language or inline controls: ${path}`);
    for (const [rule, setting] of Object.entries(jsonRules(file.lintProfile))) {
      const expected = Array.isArray(setting) ? [2, ...setting.slice(1)] : [2];
      // ESLint may load config in another VM realm; compare values, not prototypes.
      if (JSON.stringify(config.rules[rule]) !== JSON.stringify(expected))
        throw new Error(`Required JSON rule disabled: ${path}: ${rule}`);
    }
    if (
      file.lintProfile === "data" &&
      config.rules["json/no-unnormalized-keys"]?.[0] > 0
    )
      throw new Error(`Wrong JSON normalization scope: ${path}`);
    const info = await prettier.getFileInfo(absolute, {
      ignorePath: join(root, ".prettierignore"),
      resolveConfig: false,
    });
    if (!info.ignored)
      throw new Error(`Direct Prettier JSON writes are not protected: ${path}`);
    const options = await prettier.resolveConfig(absolute, {
      editorconfig: true,
    });
    if (
      !options ||
      Object.keys(options).length !== Object.keys(formatOptions).length ||
      Object.entries(formatOptions).some(
        ([key, value]) =>
          JSON.stringify(options[key]) !== JSON.stringify(value),
      )
    )
      throw new Error(`Wrong JSON formatter options: ${path}`);
    if (file.allowFormatWrites) formatted++;
  }
  if (!formatted)
    throw new Error("Expected native JSON write selection is empty.");
  return {
    root,
    policy,
    linter,
    formatOptions,
    counts: {
      tracked: tracked.size,
      linted: records.size,
      formatted,
      preserved: tracked.size - formatted,
    },
  };
}

/** Count view for callers that only need inventory evidence. */
export async function checkJsonInventory(options) {
  return (await inspectJsonInventory(options)).counts;
}
