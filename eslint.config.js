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

  // 1. Browser-compatible source: Browser globals only
  {
    files: ["src/**/*.js", "packages/universal-ontology-query/src/**/*.js", "packages/universal-ontology-projection-policy/src/**/*.js"],
    ignores: [
      "packages/universal-ontology-query/src/fileSystemOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/httpOntologyQueryArtifactReader.js",
      "packages/universal-ontology-query/src/persistentOntologyQueryArtifactCache.js",
      "packages/universal-ontology-query/src/persistentHttpOntologyQueryArtifactRepository.js",
      "packages/universal-ontology-query/src/persistentHttpRepository.js"
    ],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: strictRules
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
      "packages/universal-ontology-query/src/persistentHttpRepository.js"
    ],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.node
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
    files: ["**/*.test.js", "**/*.spec.js", "tests/**/*.js", "packages/*/tests/**/*.js"],
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
    files: ['scripts/**/*.js', 'packages/*/scripts/**/*.js'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },

  eslintConfigPrettier
];
