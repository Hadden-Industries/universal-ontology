/** Shared native JSON contracts. Selection belongs to .json-quality.json;
 * presentation options belong to .prettierrc.json. Consumers retain semantics.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import json from "@eslint/json";
import Ajv from "ajv";
import * as prettier from "prettier";

export const JSON_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const JSON_SUFFIX =
  /\.(?:json|jsonc|json5|jsonld|jsonl|ndjson|sarif)$/iu;
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
  required: ["schemaVersion", "files"],
  properties: {
    schemaVersion: { const: 2 },
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
          "allowFormatWrites",
          "formatContract",
          "validation",
        ],
        properties: {
          path: { type: "string", minLength: 1 },
          class: { enum: ["authored", "producer", "preserved"] },
          owner: { type: "string", pattern: "\\S" },
          lintProfile: { enum: ["control", "data"] },
          allowFormatWrites: { type: "boolean" },
          formatContract: { enum: ["prettier-json", "producer-json-body"] },
          validation: { type: "string", pattern: "\\S" },
          preserveReason: { type: "string", pattern: "\\S" },
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
  return policy;
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
  } else if (formatContract !== "prettier-json")
    throw new Error(`Unknown JSON formatting contract: ${formatContract}`);
  return prettier.check(text, options);
}
