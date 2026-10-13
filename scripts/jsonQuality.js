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
  "uo-json/interoperability": "error",
  // Native key autofixes have no whole-object collision preflight.
  "json/no-unnormalized-keys": "off",
});

const EMPTY_KEY_POINTERS = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "string", pattern: "^(?:/(?:[^~/]|~[01])*)*/$" },
};

/** Compare the exact decimal integer, without binary64 rounding or exponent expansion. */
function isUnsafeInteger(raw) {
  const [, integer, fraction = "", exponent = "0"] = raw.match(
    /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/u,
  );
  let digits = (integer + fraction).replace(/^0+/u, "");
  if (!digits) return false;
  const significant = digits.replace(/0+$/u, "");
  const scale =
    BigInt(exponent) -
    BigInt(fraction.length) +
    BigInt(digits.length - significant.length);
  digits = significant;
  if (scale < 0n) return false;
  const length = BigInt(digits.length) + scale;
  if (length !== 16n) return length > 16n;
  return digits.padEnd(16, "0") > "9007199254740991";
}

/** Resolve only exceptional empty keys; ordinary keys need no ancestor walk. */
function memberPointer(sourceCode, member) {
  const parts = [];
  for (let node = member; node; node = sourceCode.getParent(node)) {
    if (node.type === "Member")
      parts.push(node.name.value.replaceAll("~", "~0").replaceAll("/", "~1"));
    else if (node.type === "Element")
      parts.push(String(sourceCode.getParent(node).elements.indexOf(node)));
  }
  return `/${parts.reverse().join("/")}`;
}

/** Analyze the native JSON AST once; lint and source/producer fixes share it. */
function inspectNormalization(document) {
  const changes = [];
  const collisions = [];
  const pending = [{ node: document.body, kind: "value" }];
  while (pending.length) {
    const { node, kind } = pending.pop();
    if (node.type === "String") {
      const normalized = node.value.normalize("NFC");
      if (normalized !== node.value) changes.push({ node, kind, normalized });
    } else if (node.type === "Object") {
      const names = new Map();
      for (const member of node.members) {
        const normalized = member.name.value.normalize("NFC");
        const prior = names.get(normalized);
        if (prior && prior.value !== member.name.value)
          collisions.push({ node: member.name });
        names.set(normalized, member.name);
        pending.push({ node: member.name, kind: "key" });
        pending.push({ node: member.value, kind: "value" });
      }
    } else if (node.type === "Array") {
      for (const element of node.elements)
        pending.push({ node: element.value, kind: "value" });
    }
  }
  return { changes, collisions };
}

const qualityPlugin = {
  rules: {
    "meaningful-keys": {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [EMPTY_KEY_POINTERS],
        messages: {
          empty:
            "Empty or whitespace-only JSON key; fix its owning source or producer.",
          whitespace:
            "JSON key has leading or trailing whitespace; fix its owning source or producer without automatic trimming.",
        },
      },
      create(context) {
        const allowed = new Set(context.options[0] ?? []);
        return {
          Member(node) {
            const key = node.name.value;
            if (!key.trim()) {
              // Native no-empty-keys owns the default. With an exception, retain
              // equivalent checking everywhere except its exact decoded pointer.
              if (
                allowed.size &&
                (key !== "" ||
                  !allowed.has(memberPointer(context.sourceCode, node)))
              )
                context.report({ node: node.name, messageId: "empty" });
            } else if (key.trim() !== key)
              context.report({ node: node.name, messageId: "whitespace" });
          },
        };
      },
    },
    interoperability: {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [],
        messages: {
          noncharacter:
            "Unicode noncharacter {{codePoint}} is not interoperable JSON; fix its owning source or producer.",
          integer:
            "The exact integer '{{value}}' is outside the safe integer range, regardless of decimal or exponent spelling.",
        },
      },
      create(context) {
        return {
          String(node) {
            const noncharacters = new Set();
            for (const character of node.value) {
              const point = character.codePointAt(0);
              if (
                (point >= 0xfdd0 && point <= 0xfdef) ||
                point % 0x10000 >= 0xfffe
              )
                noncharacters.add(
                  `U+${point.toString(16).toUpperCase().padStart(4, "0")}`,
                );
            }
            for (const codePoint of noncharacters)
              context.report({
                node,
                messageId: "noncharacter",
                data: { codePoint },
              });
          },
          Number(node) {
            const raw = context.sourceCode.getText(node);
            // The native rule already diagnoses unsafe plain integer literals.
            if (/[.e]/iu.test(raw) && isUnsafeInteger(raw))
              context.report({
                node,
                messageId: "integer",
                data: { value: raw },
              });
          },
        };
      },
    },
    "normalized-strings": {
      meta: {
        type: "problem",
        languages: ["json/json"],
        schema: [{ enum: ["NFC", "preserve"] }],
        messages: {
          unnormalized:
            "JSON {{kind}} is not NFC; fix its owning source or producer with collision preflight.",
          collision:
            "NFC would create duplicate keys in this object; resolve the owning source before normalization.",
        },
      },
      create(context) {
        if (context.options[0] === "preserve") return {};
        return {
          Document(document) {
            const { changes, collisions } = inspectNormalization(document);
            for (const { node, kind } of changes)
              context.report({
                node,
                messageId: "unnormalized",
                data: { kind },
              });
            for (const { node } of collisions)
              context.report({ node, messageId: "collision" });
          },
        };
      },
    },
  },
};

function meaningfulKeyRules(allowEmptyKeys) {
  return {
    "json/no-empty-keys": allowEmptyKeys?.length ? "off" : "error",
    "uo-json/meaningful-keys": allowEmptyKeys?.length
      ? ["error", [...allowEmptyKeys].sort()]
      : "error",
  };
}

export function jsonRules(lintProfile, normalization = "NFC", allowEmptyKeys) {
  if (lintProfile !== "control" && lintProfile !== "data")
    throw new Error(`Unknown JSON lint profile: ${lintProfile}`);
  if (!["NFC", "preserve"].includes(normalization))
    throw new Error(`Unknown JSON normalization contract: ${normalization}`);
  return {
    ...DATA_RULES,
    ...meaningfulKeyRules(allowEmptyKeys),
    "uo-json/normalized-strings": ["error", normalization],
  };
}

/** Used by repository ESLint, policy bootstrap and rebuilt-package qualification. */
export function jsonLintConfig(files) {
  return [
    {
      files: files.map((file) => file.path),
      plugins: { json, "uo-json": qualityPlugin },
      language: "json/json",
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "error",
      },
      rules: jsonRules("data"),
    },
    ...(files.some((file) => file.normalization === "preserve")
      ? [
          {
            files: files
              .filter((file) => file.normalization === "preserve")
              .map((file) => file.path),
            rules: { "uo-json/normalized-strings": ["error", "preserve"] },
          },
        ]
      : []),
    ...files
      .filter((file) => file.allowEmptyKeys?.length)
      .map((file) => ({
        files: [file.path],
        rules: meaningfulKeyRules(file.allowEmptyKeys),
      })),
  ];
}

// Closed local schema: no remote references, defaults or coercion.
const validatePolicy = new Ajv({ strict: true, allErrors: true }).compile({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "defaults", "exceptions"],
  properties: {
    schemaVersion: { const: 4 },
    defaults: {
      type: "object",
      additionalProperties: false,
      required: [
        "lintProfile",
        "formatContract",
        "allowFormatWrites",
        "normalization",
      ],
      properties: {
        lintProfile: { const: "data" },
        formatContract: { const: "prettier-json" },
        allowFormatWrites: { const: true },
        normalization: { const: "NFC" },
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
          normalization: { const: "preserve" },
          allowEmptyKeys: EMPTY_KEY_POINTERS,
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
    if (rule.normalization === "preserve" && rule.allowFormatWrites !== false)
      throw new Error(
        "A normalization preservation exception must prohibit generic writes.",
      );
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
      "normalization",
      "allowEmptyKeys",
    ]) {
      if (rule[key] === undefined) continue;
      const value =
        key === "allowEmptyKeys" ? [...rule[key]].sort() : rule[key];
      if (
        explicit.has(key) &&
        JSON.stringify(explicit.get(key)) !== JSON.stringify(value)
      )
        throw new Error(`Conflicting JSON exceptions: ${path}: ${key}`);
      explicit.set(key, value);
      contract[key] = value;
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
    ...STRICT_JSON_GLOBS.map((path) => ({ path, ...policy.defaults })),
    ...policy.exceptions
      .filter((rule) => rule.normalization || rule.allowEmptyKeys)
      .flatMap((rule) =>
        rule.paths.map((path) => ({ path, ...policy.defaults, ...rule })),
      ),
  ];
}

/** Pure source/producer operation: never writes or reserializes non-string tokens.
 * Callers own source selection, regeneration, semantic validation and publication.
 */
export async function normalizeJsonSource(
  text,
  { normalization = "NFC", allowEmptyKeys } = {},
) {
  if (normalization !== "NFC")
    throw new Error("Preserved JSON string identity cannot be normalized.");
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([
      {
        path: "source.json",
        lintProfile: "data",
        normalization: "preserve",
        allowEmptyKeys,
      },
    ]),
  });
  const [result] = await linter.lintText(text, { filePath: "source.json" });
  if (result.errorCount || result.warningCount)
    throw new Error("Cannot normalize invalid or unsafe JSON source.");
  const parsed = json.languages.json.parse({ body: text });
  if (!parsed.ok) throw new Error("Cannot normalize invalid JSON source.");
  const { changes, collisions } = inspectNormalization(parsed.ast);
  if (collisions.length)
    throw new Error(
      "NFC would create duplicate keys; resolve the owning source first.",
    );
  const chunks = [];
  let cursor = 0;
  for (const { node, normalized } of changes.sort(
    (left, right) => left.node.range[0] - right.node.range[0],
  )) {
    chunks.push(text.slice(cursor, node.range[0]), JSON.stringify(normalized));
    cursor = node.range[1];
  }
  chunks.push(text.slice(cursor));
  return chunks.join("");
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
