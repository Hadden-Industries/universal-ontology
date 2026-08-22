import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

const strictRules = {
  "no-var": "error",
  "prefer-const": "error",
  "object-shorthand": ["error", "always"],
  "prefer-template": "error",
  "prefer-rest-params": "error",
  "prefer-spread": "error",
  curly: ["error", "all"],
  eqeqeq: ["error", "always", { null: "ignore" }],
  "no-use-before-define": ["error", { functions: false, classes: true, variables: true }],
  "no-unused-vars": [
    "error",
    {
      vars: "all",
      args: "after-used",
      argsIgnorePattern: "^_",
      caughtErrors: "all",
      caughtErrorsIgnorePattern: "^_"
    }
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
  "no-new": "error"
};

export default [
  js.configs.recommended,

  // 1. Frontend Code: Browser globals only
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: strictRules
  },

  // 2. Build Scripts & Configs: Node globals only
  {
    files: ["eslint.config.js", "stylelint.config.js", "build/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: strictRules
  },

  // 3. Test Files: Jest, Node, and Browser globals
  {
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser
      }
    },
    rules: strictRules
  },

  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },

  eslintConfigPrettier
];
