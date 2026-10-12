import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import json from "@eslint/json";
import { readFileSync } from "node:fs";

// One exact-path policy owns JSON selection; the inventory gate checks native effective configuration.
const jsonFiles = JSON.parse(
  readFileSync(new URL("./.json-quality.json", import.meta.url), "utf8"),
).files;

const strictRules = {
  "no-var": "error",
  "prefer-const": "error",
  "object-shorthand": ["error", "always"],
  "prefer-template": "error",
  "prefer-rest-params": "error",
  "prefer-spread": "error",
  curly: ["error", "all"],
  eqeqeq: ["error", "always", { null: "ignore" }],
  "no-use-before-define": [
    "error",
    { functions: false, classes: true, variables: true },
  ],
  "no-unused-vars": [
    "error",
    {
      vars: "all",
      args: "after-used",
      argsIgnorePattern: "^_",
      caughtErrors: "all",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "no-undef": "error",
  "no-prototype-builtins": "error",
  "no-empty": ["error", { allowEmptyCatch: false }],
  "no-control-regex": "error",
  "no-redeclare": "error",
  "no-bitwise": "error",
  "guard-for-in": "error",
  "no-caller": "error",
  "no-new": "error",
};

export default [
  { ...js.configs.recommended, files: ["**/*.{js,mjs,cjs}"] },
  {
    files: jsonFiles.map((file) => file.path),
    plugins: { json },
    language: "json/json",
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "json/no-duplicate-keys": "error",
      "json/no-unsafe-values": "error",
    },
  },
  {
    files: jsonFiles
      .filter((file) => file.lintProfile === "control")
      .map((file) => file.path),
    rules: { "json/no-unnormalized-keys": ["error", { form: "NFC" }] },
  },

  // 1. Browser-compatible source: Browser globals only
  {
    files: [
      "src/**/*.js",
      "packages/universal-ontology-query/src/**/*.js",
      "packages/universal-ontology-projection-policy/src/**/*.js",
    ],
    ignores: [
      "packages/universal-ontology-query/src/fileSystemOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/httpOntologyQueryArtifactReader.js",
      "packages/universal-ontology-query/src/persistentOntologyQueryArtifactCache.js",
      "packages/universal-ontology-query/src/persistentHttpOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/persistentHttpRepository.js",
    ],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: strictRules,
  },

  // Node-only query repositories and installed-server adapters retain the source rule set while
  // receiving only the platform globals required by their runtime boundary.
  {
    files: [
      "packages/universal-ontology-mcp-server/src/**/*.js",
      "packages/universal-ontology-query/src/fileSystemOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/httpOntologyQueryArtifactReader.js",
      "packages/universal-ontology-query/src/persistentOntologyQueryArtifactCache.js",
      "packages/universal-ontology-query/src/persistentHttpOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/persistentHttpRepository.js",
    ],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: strictRules,
  },

  // 2. Build Scripts & Configs: Node globals only
  {
    files: ["eslint.config.js", "stylelint.config.js", "build/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: strictRules,
  },

  // 3. Test Files: Jest, Node, and Browser globals
  {
    files: [
      "**/*.test.js",
      "**/*.spec.js",
      "tests/**/*.js",
      "packages/*/tests/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: strictRules,
  },

  {
    files: ["scripts/**/*.{js,mjs}", "packages/*/scripts/**/*.js"],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },

  { ...eslintConfigPrettier, files: ["**/*.{js,mjs,cjs}"] },
];
