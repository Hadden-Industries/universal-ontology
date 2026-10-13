/** Shared native JSON contracts. Selection belongs to .json-quality.json;
 * presentation options belong to .prettierrc.json. Consumers retain semantics.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import json from "@eslint/json";
import Ajv from "ajv";
import * as prettier from "prettier";

export const JSON_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const JSON_SUFFIX =
  /\.(?:json|jsonc|json5|jsonld|jsonl|ndjson|sarif)$/iu;
export const STRICT_JSON_GLOBS = ["**/*.json", "**/*.jsonld", "**/*.sarif"];
const DATA_RULES = Object.freeze({
  "json/no-duplicate-keys": "error",
  "json/no-unsafe-values": "error",
});
const CONTROL_RULES = Object.freeze({
  "json/no-unnormalized-keys": ["error", { form: "NFC" }],
});

export function jsonRules(lintProfile) {
  if (lintProfile !== "control" && lintProfile !== "data")
    throw new Error(`Unknown JSON lint profile: ${lintProfile}`);
  return {
    ...DATA_RULES,
    ...(lintProfile === "control" ? CONTROL_RULES : {}),
  };
}

/** Used by repository ESLint, policy bootstrap and rebuilt-package qualification. */
export function jsonLintConfig(files) {
  return [
    {
      files: files.map((file) => file.path),
      plugins: { json },
      language: "json/json",
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "error",
      },
      rules: jsonRules("data"),
    },
    ...(files.some((file) => file.lintProfile === "control")
      ? [
          {
            files: files
              .filter((file) => file.lintProfile === "control")
              .map((file) => file.path),
            rules: CONTROL_RULES,
          },
        ]
      : []),
  ];
}

// Closed local schema: no remote references, defaults or coercion.
const validatePolicy = new Ajv({ strict: true, allErrors: true }).compile({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "defaults", "exceptions"],
  properties: {
    schemaVersion: { const: 3 },
    defaults: {
      type: "object",
      additionalProperties: false,
      required: ["lintProfile", "formatContract", "allowFormatWrites"],
      properties: {
        lintProfile: { const: "data" },
        formatContract: { const: "prettier-json" },
        allowFormatWrites: { const: true },
      },
    },
    exceptions: {
      type: "array",
      uniqueItems: true,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["paths", "owner", "reason"],
        minProperties: 4,
        properties: {
          paths: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
          owner: { type: "string", pattern: "\\S" },
          reason: { type: "string", pattern: "\\S" },
          exclude: { const: true },
          lintProfile: { enum: ["control", "data"] },
          allowFormatWrites: { const: false },
          formatContract: {
            enum: [
              "producer-json-body",
              "producer-json-indent",
              "producer-json-indent-body",
              "producer-json-compact",
            ],
          },
        },
      },
    },
  },
});

export function decodeJsonBytes(bytes) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Bootstrap independently of repository configuration before parsing policy. */
export async function readJsonPolicy(root = JSON_ROOT) {
  const text = decodeJsonBytes(readFileSync(join(root, ".json-quality.json")));
  const linter = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([
      { path: ".json-quality.json", lintProfile: "control" },
    ]),
  });
  const [result] = await linter.lintText(text, {
    filePath: ".json-quality.json",
  });
  if (result.errorCount || result.warningCount)
    throw new Error(`Invalid JSON policy: ${JSON.stringify(result.messages)}`);
  const policy = JSON.parse(text);
  if (!validatePolicy(policy))
    throw new Error(
      `Invalid JSON policy structure: ${JSON.stringify(validatePolicy.errors)}`,
    );
  for (const rule of policy.exceptions) {
    for (const pattern of rule.paths)
      if (
        pattern.startsWith("/") ||
        pattern.includes("\\") ||
        pattern.includes(":") ||
        pattern
          .split("/")
          .some((part) => part === ".." || part === "." || !part)
      )
        throw new Error(`Unsafe JSON exception pattern: ${pattern}`);
    if (
      rule.exclude &&
      Object.keys(rule).some(
        (key) => !["paths", "owner", "reason", "exclude"].includes(key),
      )
    )
      throw new Error("An external boundary cannot also redefine JSON checks.");
  }
  return policy;
}

/** Sparse exceptions amend mandatory defaults; contradictory overlaps fail closed. */
export function jsonContract(path, policy, { tracked = false } = {}) {
  const contract = { path, ...policy.defaults, exclude: false, exceptions: [] };
  const explicit = new Map();
  for (const rule of policy.exceptions) {
    if (!rule.paths.some((pattern) => posix.matchesGlob(path, pattern)))
      continue;
    contract.exceptions.push({ owner: rule.owner, reason: rule.reason });
    for (const key of [
      "lintProfile",
      "formatContract",
      "allowFormatWrites",
      "exclude",
    ]) {
      if (rule[key] === undefined) continue;
      if (explicit.has(key) && explicit.get(key) !== rule[key])
        throw new Error(`Conflicting JSON exceptions: ${path}: ${key}`);
      explicit.set(key, rule[key]);
      contract[key] = rule[key];
    }
  }
  // Installed-tree boundaries never conceal a repository-owned tracked file.
  if (tracked && contract.exclude) {
    contract.exclude = false;
    contract.allowFormatWrites = false;
  }
  return contract;
}

/** Native ESLint discovers ordinary JSON without an admission allowlist. */
export function jsonPolicyLintFiles(policy) {
  return [
    ...STRICT_JSON_GLOBS.map((path) => ({ path, lintProfile: "data" })),
    ...policy.exceptions
      .filter((rule) => rule.lintProfile)
      .flatMap((rule) =>
        rule.paths.map((path) => ({ path, lintProfile: rule.lintProfile })),
      ),
  ];
}

/** The root native configuration is the sole presentation-options authority. */
export async function jsonFormatOptions(root = JSON_ROOT) {
  const options = await prettier.resolveConfig(
    join(root, ".json-quality.json"),
    { editorconfig: true },
  );
  if (options?.parser !== "json-stringify")
    throw new Error(
      "Strict JSON formatting requires the native json-stringify parser.",
    );
  return options;
}

/** Read-only native presentation, shared with producer/packed-target checks. */
export async function checkJsonPresentation(bytes, formatContract, options) {
  let text = decodeJsonBytes(bytes);
  if (formatContract === "producer-json-body") {
    text = text.replaceAll("\r\n", "\n");
    if (!text.endsWith("\n")) text += "\n";
  } else if (
    [
      "producer-json-indent",
      "producer-json-indent-body",
      "producer-json-compact",
    ].includes(formatContract)
  ) {
    // Existing producers use the platform serializer; validate its exact bytes.
    const pretty = formatContract !== "producer-json-compact";
    if (formatContract === "producer-json-indent-body") {
      text = text.replaceAll("\r\n", "\n");
      if (!text.endsWith("\n")) text += "\n";
    }
    return (
      text ===
      JSON.stringify(JSON.parse(text), null, pretty ? 2 : undefined) + "\n"
    );
  } else if (formatContract !== "prettier-json")
    throw new Error(`Unknown JSON formatting contract: ${formatContract}`);
  return prettier.check(text, options);
}
