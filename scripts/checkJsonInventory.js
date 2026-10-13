import { isDeepStrictEqual } from "node:util";
/** Reconcile Git's complete JSON inventory and native tool configuration.
 * This gate never writes JSON. ESLint owns syntax/rules; consumers own semantics.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync, readdirSync } from "node:fs";
import { join, relative, resolve, isAbsolute, sep } from "node:path";
import { ESLint } from "eslint";
import json from "@eslint/json";
import * as prettier from "prettier";
import {
  JSON_ROOT,
  JSON_SUFFIX,
  isStrictJsonPath,
  readJsonPolicy,
  jsonRules,
  jsonFormatOptions,
  decodeJsonBytes,
  jsonContract,
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
  if (mode !== undefined && mode !== "100644" && mode !== "100755")
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
export async function inspectJsonInventory({
  root = JSON_ROOT,
  requireGenerated = false,
} = {}) {
  root = resolve(root);
  const policy = await readJsonPolicy(root);
  const formatOptions = await jsonFormatOptions(root);
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
  const tracked = new Map();
  const folded = new Map();
  const paths = new Set();
  function add(path) {
    assertLiteralPath(path);
    const prior = folded.get(path.toLowerCase());
    if (prior && prior !== path)
      throw new Error(`Case-colliding JSON path: ${path}`);
    folded.set(path.toLowerCase(), path);
    paths.add(path);
  }
  for (const entry of git(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)) {
    const tab = entry.indexOf("\t");
    const path = entry.slice(tab + 1);
    if (!JSON_SUFFIX.test(path)) continue;
    const [mode, , stage] = entry.slice(0, tab).split(" ");
    if (stage !== "0" || tracked.has(path))
      throw new Error(`Unmerged JSON entry: ${path}`);
    tracked.set(path, mode);
    add(path);
  }
  const visible = new Set(
    git(["ls-files", "--others", "--exclude-standard", "-z"])
      .split("\0")
      .filter(Boolean),
  );
  const boundaries = [];
  function walk(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name;
      const contract = jsonContract(
        path + (entry.isDirectory() ? "/" : ""),
        policy,
      );
      const directoryContract = entry.isSymbolicLink()
        ? jsonContract(path + "/", policy)
        : contract;
      if (contract.exclude || directoryContract.exclude) {
        boundaries.push({
          path,
          exceptions: (contract.exclude ? contract : directoryContract)
            .exceptions,
        });
        continue;
      }
      if (entry.isSymbolicLink())
        throw new Error(`Nonregular JSON discovery path: ${path}`);
      if (entry.isDirectory()) walk(join(directory, entry.name), path + "/");
      else if (JSON_SUFFIX.test(path)) add(path);
    }
  }
  walk(root);
  const files = [...paths].sort().map((path) => {
    if (!isStrictJsonPath(path))
      throw new Error(`Unqualified JSON dialect: ${path}`);
    assertRegularFile(root, path, tracked.get(path));
    const file = jsonContract(path, policy, { tracked: tracked.has(path) });
    // Git ignore affects generic writes only, never read-only discovery/checking.
    file.allowFormatWrites &&= tracked.has(path) || visible.has(path);
    return file;
  });
  if (!files.length) throw new Error("Expected JSON inventory is empty.");
  if (
    requireGenerated &&
    (!files.some(
      (file) => file.path.startsWith("dist/") && file.path.endsWith(".jsonld"),
    ) ||
      !files.some((file) => file.path === "dist/query/v1/catalog.json"))
  )
    throw new Error(
      "Expected generated JSON/JSON-LD is missing; run build:verify before the final gate.",
    );
  const linter = new ESLint({
    cwd: root,
    overrideConfigFile: join(root, "eslint.config.js"),
    // Only our discovered files are passed to lint; indexed files inside an
    // installed-tree boundary must still bypass ESLint's default directory skip.
    overrideConfig: [{ ignores: ["!**/node_modules/"] }],
  });
  for (const file of files) {
    const { path } = file;
    const absolute = join(root, path);
    try {
      decodeJsonBytes(readFileSync(absolute));
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error });
    }
    const config = await linter.calculateConfigForFile(absolute);
    if (
      !config ||
      config.language !== json.languages.json ||
      config.linterOptions.noInlineConfig !== true
    )
      throw new Error(`Wrong native JSON language or inline controls: ${path}`);
    for (const [rule, setting] of Object.entries(
      jsonRules({
        normalization: file.normalization,
        allowEmptyKeys: file.allowEmptyKeys,
      }),
    )) {
      if (setting === "off") {
        if (config.rules[rule]?.[0] !== 0)
          throw new Error(
            `Required JSON rule must remain disabled: ${path}: ${rule}`,
          );
        continue;
      }
      const expected = Array.isArray(setting) ? [2, ...setting.slice(1)] : [2];
      // Native configuration loading may cross JavaScript realms. Its JSON
      // values are authoritative; realm-specific array/object prototypes are not.
      if (!isDeepStrictEqual(config.rules[rule], expected, true))
        throw new Error(`Required JSON rule disabled: ${path}: ${rule}`);
    }
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
        ([key, value]) => !isDeepStrictEqual(options[key], value, true),
      )
    )
      throw new Error(`Wrong JSON formatter options: ${path}`);
  }
  const formatted = files.filter((file) => file.allowFormatWrites).length;
  return {
    root,
    policy,
    files,
    boundaries,
    linter,
    formatOptions,
    counts: {
      discovered: files.length,
      tracked: tracked.size,
      linted: files.length,
      formatted,
      preserved: files.length - formatted,
    },
  };
}

/** Count view for callers that only need inventory evidence. */
export async function checkJsonInventory(options) {
  return (await inspectJsonInventory(options)).counts;
}
