import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import validatePlan from "./pullRequestCheckPlanValidator.js";
import {
  NODE_FAMILY_TEST_INPUTS,
  changedNodeFamilies,
} from "./pullRequestNodeFamilies.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const CORE_CHECK_CONSUMER_IDS = Object.freeze([
  "development",
  "ontology",
  "node",
  "website",
  "distribution",
]);
export const CORE_SCOPE_TO_JOBS = Object.freeze({
  style_tooling: ["development"],
  python_style: ["development"],
  python_tests: ["development"],
  python_setup_tests: ["development"],
  documentation: ["development"],
  ontology_validation: ["ontology"],
  ontology_validation_workflow: ["ontology"],
  ontology_entity_contracts: ["ontology"],
  ontology_policy_qa: ["ontology"],
  ontology_qualification: ["ontology"],
  agent_skills_lock: ["development"],
  development: ["development"],
  product_tests: ["node"],
  ci_control: ["node"],
  mcp_artifacts: ["node", "distribution"],
  website_build: ["node", "website"],
  mcp_docs: ["distribution"],
  mcp_application: ["node", "distribution"],
  mcp_release_qualification: ["node", "distribution"],
});
export const CORE_CHECK_SCOPE_NAMES = Object.freeze(
  Object.keys(CORE_SCOPE_TO_JOBS),
);
// This closed first route covers package-release controls only. Shared admission
// inputs and mixed changes keep the existing conservative product route.
export const CI_CONTROL_INPUTS = Object.freeze([
  ".github/workflows/manual-mcp-packages.yml",
  "scripts/distribution/prepareManualMcpRelease.js",
  "scripts/distribution/verifyUniversalOntologyMcpRelease.js",
  "tests/distribution/manual-mcp-packages.test.js",
  "tests/distribution/manual-mcp-cache-budget.test.js",
  "tests/distribution/universal-ontology-mcp-release-verifier.test.js",
]);
export const PYTHON_ONLY_TEST_INPUTS = Object.freeze([
  "tests/test_editing_policy_rendering.py",
  "tests/test_import_catalogs.py",
  "tests/test_ontology_entity_changes.py",
  "tests/test_ontology_policy.py",
  "tests/test_ontology_policy_cli.py",
  "tests/test_ontology_policy_coverage.py",
  "tests/test_ontology_policy_engines.py",
  "tests/test_ontology_policy_reports.py",
  "tests/test_policy_authorities.py",
  "tests/test_publication_gate.py",
  "tests/test_run_tests_in_parallel.py",
  "tests/test_validate_ontologies.py",
]);
const PYTHON_ONLY_INPUTS = [...PYTHON_ONLY_TEST_INPUTS];
function isPythonOnlyInput(path) {
  return PYTHON_ONLY_INPUTS.includes(path);
}
/** Derive the complete ordered consumer set; the gate independently recomputes it. */
export function requiredJobsForScopes(scopes) {
  const selected = new Set(
    Object.entries(CORE_SCOPE_TO_JOBS).flatMap(([scope, jobs]) =>
      scopes[scope] === true ? jobs : [],
    ),
  );
  return CORE_CHECK_CONSUMER_IDS.filter((id) => selected.has(id));
}

/** Validate schema and redundant selection invariants without installing dependencies. */
export function assertCheckPlan(plan) {
  if (!validatePlan(plan))
    throw new Error(
      `Invalid check plan: ${JSON.stringify(validatePlan.errors)}`,
    );
  if (
    JSON.stringify(plan.requiredJobs) !==
    JSON.stringify(requiredJobsForScopes(plan.scopes))
  )
    throw new Error("Plan consumers disagree with scopes.");
  if (
    plan.scopes.ci_control &&
    !plan.scopes.product_tests &&
    Object.entries(plan.scopes).some(
      ([scope, selected]) => scope !== "ci_control" && selected,
    )
  )
    throw new Error(
      "Narrow control coverage cannot omit mixed product obligations.",
    );
  return plan;
}
const ONTOLOGY_WORKFLOW = ".github/workflows/ontology-validation.yml";
const ONTOLOGY_WORKFLOW_SCOPES = [
  "ontology_validation",
  "ontology_policy_qa",
  "ontology_entity_contracts",
  "ontology_qualification",
  "ontology_validation_workflow",
];
const CODEQL_COMMON_INPUTS = [
  "scripts/selectPullRequestChecks.js",
  "tests/pr-check-scopes.test.js",
  ".github/workflows/codeql.yml",
  ".github/codeql",
  ":(glob)**/*.ql",
  ":(glob)**/*.qll",
  ":(glob)**/qlpack.yml",
];
const COMMON_INPUTS = [
  "scripts/selectPullRequestChecks.js",
  "tests/pr-check-scopes.test.js",
  ".node-version",
  "package.json",
  "package-lock.json",
];
// Python ontology jobs do not consume the Node package manifests. Track their
// own source, policy and execution inputs instead of COMMON_INPUTS.
const ONTOLOGY_POLICY_INPUTS = [
  "scripts/selectPullRequestChecks.js",
  "tests/pr-check-scopes.test.js",
  ".python-version",
  "requirements.txt",
  "requirements.lock.txt",
  "scripts/validate_ontologies.py",
  "scripts/ontology_policy",
  "policy",
  "core",
  "extended",
  "reference-data",
  "iso-31073",
  "iso-iec11179-3",
  "src/universal",
  "src/iso/31073",
  "src/iso-iec/11179/-3",
  "dist/universal",
  "dist/iso/31073",
  "dist/iso-iec/11179/-3",
  "tests/__init__.py",
  "tests/fixtures/ontology-policy",
  "tests/test_ontology_policy.py",
  "tests/test_ontology_entity_changes.py",
];
export const CHECK_INPUTS = {
  // Content checks and toolchain verification have different consumers: a
  // Markdown edit must not select Python or platform regression checks.
  style_tooling: [
    ...COMMON_INPUTS,
    ".python-version",
    "requirements.txt",
    "requirements-dev.txt",
    "requirements.lock.txt",
    ".gitignore",
    ".prettierignore",
    ".prettierrc.json",
    ".snapperrc.toml",
    "ruff.toml",
    ".github/workflows/development-checks.yml",
    "scripts/formatDocumentation.js",
    "scripts/prepareDocumentationTools.js",
    "scripts/preparePythonStyleTools.js",
    "scripts/setUpDevelopmentEnvironment.js",
    "scripts/runRepositoryPython.js",
    "tests/prose-formatting.test.js",
    "tests/documentation-tools.test.js",
    "tests/python-style-tools.test.js",
  ],
  python_style: [
    ":(glob)**/*.py",
    ":(glob)**/*.pyi",
    ":(glob)**/*.ipynb",
    ":(exclude)src/external",
    ":(exclude)tests/fixtures",
    ":(exclude)dist",
    ":(exclude).agents/skills",
    ":(exclude).claude/skills",
    ":(exclude).agent-tools",
    ":(exclude).sdlc",
  ],
  // The whole Python unit suite: every Python source, test and fixture, plus the
  // interpreter, locked requirements, launcher and workflow that execute it.
  python_tests: [
    ...COMMON_INPUTS,
    ".python-version",
    "requirements.txt",
    "requirements-dev.txt",
    "requirements.lock.txt",
    ".github/workflows/development-checks.yml",
    "scripts/runRepositoryPython.js",
    ":(glob)scripts/**/*.py",
    ":(glob)tests/**/*.py",
    "tests/fixtures",
  ],
  documentation: [
    ":(glob)*.md",
    ":(glob)docs/**/*.md",
    ":(glob)packages/*/*.md",
    ":(exclude)AGENTS.md",
    ":(exclude)docs/reviews",
    ":(exclude)docs/sdlc",
    ":(exclude)docs/plans/sdlc-improvements",
    ":(exclude)docs/policy/migration-evidence.md",
    ":(exclude)docs/policy/Editing-Policy.generated.md",
    ":(exclude)src/external",
    ":(exclude)tests/fixtures",
    ":(exclude)dist",
    ":(exclude).agents/skills",
    ":(exclude).claude/skills",
    ":(exclude).agent-tools",
    ":(exclude).sdlc",
  ],
  // This is a conservative preflight only. The Python runner remains the
  // authority for exact ontology selection after a possible input changes.
  ontology_validation: [
    ...ONTOLOGY_POLICY_INPUTS,
    ".java-version",
    "tests/test_validate_ontologies.py",
  ],
  // Workflow orchestration is owned here, not by the Python data validator.
  ontology_validation_workflow: [
    "scripts/selectPullRequestChecks.js",
    "tests/pr-check-scopes.test.js",
  ],
  ontology_entity_contracts: [
    ...ONTOLOGY_POLICY_INPUTS,
    "tests/test_publication_gate.py",
  ],
  ontology_policy_qa: [
    ...ONTOLOGY_POLICY_INPUTS,
    "scripts/render_editing_policy.py",
    "docs/policy/Editing-Policy.generated.md",
    ":(glob)tests/test_*polic*.py",
    "tests/test_publication_gate.py",
  ],
  ontology_qualification: [
    ...ONTOLOGY_POLICY_INPUTS,
    ".java-version",
    "tests/test_ontology_policy_engines.py",
  ],
  codeql_actions: [
    ...CODEQL_COMMON_INPUTS,
    ".github/workflows",
    ".github/actions",
    ":(glob)**/action.yml",
    ":(glob)**/action.yaml",
  ],
  codeql_python: [
    ...CODEQL_COMMON_INPUTS,
    ":(glob)**/*.py",
    ":(glob)**/*.pyi",
    ":(glob)**/requirements*.txt",
    ":(glob)**/pyproject.toml",
    ":(glob)**/Pipfile*",
    ":(glob)**/poetry.lock",
    ":(glob)**/uv.lock",
    ".python-version",
  ],
  codeql_javascript: [
    ...CODEQL_COMMON_INPUTS,
    ...[
      "js",
      "jsx",
      "mjs",
      "cjs",
      "ts",
      "tsx",
      "mts",
      "cts",
      "html",
      "htm",
      "vue",
      "svelte",
    ].map((extension) => `:(glob)**/*.${extension}`),
    ":(glob)**/package.json",
    ":(glob)**/package-lock.json",
    ":(glob)**/tsconfig*.json",
    ":(glob)**/jsconfig*.json",
    ":(glob)**/yarn.lock",
    ":(glob)**/pnpm-lock.yaml",
    ".node-version",
  ],
  // The committed Agent Skills lock is validated offline by a lean job, so a
  // lock-only change does not launch the development matrix. The lock is kept
  // out of `development` for that reason; the matrix still covers the same
  // test whenever the skills tooling itself changes.
  agent_skills_lock: [
    "scripts/selectPullRequestChecks.js",
    "tests/pr-check-scopes.test.js",
    ".github/workflows/development-checks.yml",
    ".python-version",
    "skills-lock.json",
    "scripts/set_up_agent_skills.py",
    "scripts/_commands.py",
    "scripts/_repository.py",
    "tests/test_set_up_agent_skills.py",
  ],
  // Development tooling: setup, the Python launcher, optional skill/MCP setup,
  // Git hooks and this selector, plus the ontology runner they install.
  development: [
    ...COMMON_INPUTS,
    ".python-version",
    "requirements.txt",
    "requirements-dev.txt",
    "requirements.lock.txt",
    "scripts/validate_ontologies.py",
    "tests/test_validate_ontologies.py",
    ".github/workflows/development-checks.yml",
    ".githooks",
    "scripts/configureGitHooks.js",
    "scripts/_commands.py",
    "scripts/_repository.py",
    "scripts/runRepositoryPython.js",
    "scripts/set_up_agent_skills.py",
    "scripts/set_up_mcp_servers.py",
    "scripts/setUpDevelopmentEnvironment.js",
    "tests/configure-git-hooks.test.js",
    "tests/development-workflow.test.js",
    "tests/set-up-development-environment.test.js",
    "tests/run-repository-python.test.js",
    "tests/test_set_up_agent_skills.py",
    "tests/test_set_up_mcp_servers.py",
  ],
  product_tests: [
    ...COMMON_INPUTS,
    ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
    ":(glob)src/**/*.js",
    ":(glob)src/**/*.css",
    ":(glob)src/**/*.html",
    "packages/universal-ontology-query",
    "packages/universal-ontology-projection-policy",
    ":(glob)scripts/**/*.js",
    ":(glob)tests/**/*.test.js",
    "tests/fixtures",
    "templates",
    "vite.config.mjs",
    "jest.config.js",
    "eslint.config.js",
    ".htmlvalidate.json",
    ".stylelintrc.json",
    ".prettierignore",
    "packages/universal-ontology-mcp-server",
    "server.json",
    "scripts/distribution/universalOntologyMcpReleaseInputs.json",
    ":(exclude)packages/universal-ontology-mcp-server/README.md",
    ":(exclude)scripts/configureGitHooks.js",
    ":(exclude)scripts/runRepositoryPython.js",
    ":(exclude)scripts/setUpDevelopmentEnvironment.js",
    ":(exclude)tests/configure-git-hooks.test.js",
    ":(exclude)tests/set-up-development-environment.test.js",
    ":(exclude)tests/run-repository-python.test.js",
    ":(exclude)tests/development-workflow.test.js",
    ":(exclude)tests/distribution/universal-ontology-mcp-documentation.test.js",
  ],
  mcp_artifacts: [
    ...COMMON_INPUTS,
    ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
    "packages/universal-ontology-mcp-server",
    "scripts/distribution",
    "server.json",
    "LICENSE",
    "packages/universal-ontology-query",
    "packages/universal-ontology-projection-policy",
    ":(exclude)packages/universal-ontology-mcp-server/README.md",
  ],
  website_build: [
    ...COMMON_INPUTS,
    ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
    "vite.config.mjs",
    "scripts/build",
    "scripts/createFullVersions.js",
    "scripts/materializeImportClosure.js",
    "scripts/verifyFullOntologyBuild.js",
    "scripts/ontology",
    "scripts/ontology_policy/publication.py",
    "scripts/upload_to_s3.py",
    "scripts/rdfXmlToJsonLd.js",
    "scripts/jsonLdToCsv.js",
    "core",
    "reference-data",
    "extended",
    "iso-iec11179-3",
    "src/universal",
    "src/iso",
    "src/iso-iec",
    "src/external",
    "templates",
    ":(glob)src/**/*.js",
    ":(glob)src/**/*.css",
    ":(glob)src/**/*.html",
    "packages/universal-ontology-query",
    "packages/universal-ontology-projection-policy",
  ],
  mcp_docs: [
    ...COMMON_INPUTS,
    "README.md",
    "docs/mcp",
    "docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md",
    "packages/universal-ontology-mcp-server/README.md",
    "tests/distribution/universal-ontology-mcp-documentation.test.js",
  ],
};

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.signal || result.status === null) {
    throw new Error("Git did not complete.");
  }
  return result;
}

function requireCommit(root, sha) {
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/iu.test(sha)) {
    throw new Error("Expected a complete GitHub commit SHA.");
  }
  const result = git(root, ["rev-parse", "--verify", sha + "^{commit}"]);
  if (result.status !== 0) {
    throw new Error("Required comparison commit is unavailable: " + sha);
  }
}

function hasChanges(root, base, head, paths) {
  const result = git(root, [
    "diff",
    "--quiet",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    base,
    head,
    "--",
    ...paths,
  ]);
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      "Cannot determine check applicability: " + result.stderr.trim(),
    );
  }
  return result.status === 1;
}

/** Return changed, surviving paths from two commits without shell or line parsing.
 * Deletions need no content check; treating renames as delete/add keeps their
 * destination eligible even when Git's rename heuristics would differ.
 */
export function changedFilePaths({ root = REPOSITORY_ROOT, base, head }) {
  requireCommit(root, base);
  requireCommit(root, head);
  const result = git(root, [
    "diff",
    "--name-only",
    "-z",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--diff-filter=ACMT",
    base,
    head,
    "--",
  ]);
  if (result.status !== 0)
    throw new Error("Cannot select changed files: " + result.stderr.trim());
  return result.stdout.split("\0").filter(Boolean);
}

export function selectPullRequestChecks({
  root = REPOSITORY_ROOT,
  base,
  head,
  scopes = Object.keys(CHECK_INPUTS),
}) {
  requireCommit(root, base);
  requireCommit(root, head);
  const ontologyWorkflowChanged = hasChanges(root, base, head, [
    ONTOLOGY_WORKFLOW,
  ]);
  const selected = {};
  for (const name of scopes) {
    const paths = CHECK_INPUTS[name];
    if (!paths) throw new Error("Unknown check scope: " + name);
    selected[name] =
      hasChanges(root, base, head, paths) ||
      (ontologyWorkflowChanged && ONTOLOGY_WORKFLOW_SCOPES.includes(name));
  }
  return selected;
}

export function runFromGitHubEnvironment(
  env = process.env,
  scopes = Object.keys(CHECK_INPUTS),
  { codeqlMatrix = false } = {},
) {
  if (
    !scopes.length ||
    scopes.some((name) => !Object.hasOwn(CHECK_INPUTS, name))
  ) {
    throw new Error("At least one known check scope is required.");
  }
  let selected;
  if (
    env.GITHUB_EVENT_NAME === "workflow_dispatch" ||
    env.GITHUB_EVENT_NAME === "schedule"
  ) {
    selected = Object.fromEntries(scopes.map((name) => [name, true]));
  } else if (
    env.GITHUB_EVENT_NAME === "pull_request" ||
    (env.GITHUB_EVENT_NAME === "push" && env.GITHUB_REF === "refs/heads/main")
  ) {
    const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    const checkedOut = git(REPOSITORY_ROOT, ["rev-parse", "HEAD"]);
    if (
      checkedOut.status !== 0 ||
      checkedOut.stdout.trim() !== env.GITHUB_SHA
    ) {
      throw new Error("The checkout does not match the event revision.");
    }
    selected = selectPullRequestChecks({
      base:
        env.GITHUB_EVENT_NAME === "pull_request"
          ? event.pull_request?.base?.sha
          : event.before,
      head: env.GITHUB_SHA,
      scopes,
    });
  } else {
    throw new Error(
      "PR check selection requires pull_request, a main push, schedule, or workflow_dispatch.",
    );
  }
  if (!env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
  const codeqlLanguages = Object.entries({
    codeql_actions: "actions",
    codeql_python: "python",
    codeql_javascript: "javascript-typescript",
  })
    .filter(([scope]) => selected[scope])
    .map(([, language]) => language);
  if (
    codeqlMatrix &&
    !["codeql_actions", "codeql_python", "codeql_javascript"].every(
      (scope) => scope in selected,
    )
  ) {
    throw new Error("CodeQL matrix requires all three CodeQL scopes.");
  }
  appendFileSync(
    env.GITHUB_OUTPUT,
    Object.entries(selected)
      .map(([name, needed]) => name + "=" + needed + "\n")
      .join("") +
      (codeqlMatrix
        ? `codeql_languages=${JSON.stringify(codeqlLanguages)}\n`
        : ""),
  );
  const report = [
    "PR check selection",
    ...Object.entries(selected).map(
      ([name, needed]) =>
        "- " +
        name +
        ": " +
        (needed
          ? "selected"
          : "not selected by the current input and policy plan"),
    ),
    "",
  ].join("\n");
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, report);
  return selected;
}

/** Build the core plan for the exact event revision. Package CI is explicit opt-in;
 * manual packages require a main dispatch. Missing push bases widen source coverage,
 * while unavailable PR bases and unsupported events fail closed.
 */
export function createCheckPlan(env = process.env, root = REPOSITORY_ROOT) {
  const revision = env.GITHUB_SHA;
  const head = git(root, ["rev-parse", "HEAD"]);
  if (
    !/^[a-f0-9]{40}$/u.test(revision ?? "") ||
    head.status !== 0 ||
    head.stdout.trim() !== revision
  )
    throw new Error("The checkout does not match the event revision.");
  const packageOption = env.MCP_PACKAGE_CI_ENABLED ?? "";
  const manualOption = env.MCP_INCLUDE_PACKAGES ?? "";
  if (
    !["", "false", "true"].includes(packageOption) ||
    !["", "false", "true"].includes(manualOption)
  )
    throw new Error(
      "Invalid package qualification option; expected true or false.",
    );
  if (
    manualOption === "true" &&
    (env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      env.GITHUB_REF !== "refs/heads/main")
  )
    throw new Error("Manual packages require a manual dispatch on main.");
  const packageMode =
    manualOption === "true"
      ? "manual"
      : packageOption === "true"
        ? "ci"
        : "disabled";
  let full = ["schedule", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME);
  if (
    !full &&
    env.GITHUB_EVENT_NAME !== "pull_request" &&
    !(env.GITHUB_EVENT_NAME === "push" && env.GITHUB_REF === "refs/heads/main")
  )
    throw new Error("Unsupported core check event.");
  const event = full
    ? {}
    : JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  let comparisonBase = full
    ? null
    : env.GITHUB_EVENT_NAME === "pull_request"
      ? event.pull_request?.base?.sha
      : event.before;
  // Pushes can lack a usable before object (initial push or incomplete history).
  // Full source coverage is safe; a PR must retain its explicit trusted base.
  if (!full && env.GITHUB_EVENT_NAME === "push") {
    try {
      requireCommit(root, comparisonBase);
    } catch {
      full = true;
      comparisonBase = null;
    }
  }
  if (!full && !/^[a-f0-9]{40}$/u.test(comparisonBase ?? ""))
    throw new Error("Missing exact comparison base.");
  let scopes;
  if (full)
    scopes = Object.fromEntries(
      CORE_CHECK_SCOPE_NAMES.map((name) => [name, true]),
    );
  else {
    requireCommit(root, comparisonBase);
    const changed = git(root, [
      "diff",
      "--name-only",
      "-z",
      "--no-renames",
      "--no-ext-diff",
      "--no-textconv",
      comparisonBase,
      revision,
      "--",
    ]);
    if (changed.status !== 0)
      throw new Error("Cannot compare event revisions.");
    const paths = changed.stdout.split("\0").filter(Boolean);
    const controlOnly =
      packageMode === "disabled" &&
      paths.length > 0 &&
      paths.every((path) => CI_CONTROL_INPUTS.includes(path));
    const testFamilies =
      packageMode === "disabled" &&
      paths.length > 0 &&
      paths.every((path) => NODE_FAMILY_TEST_INPUTS.includes(path))
        ? changedNodeFamilies({ root, base: comparisonBase, revision })
        : null;
    const knownPaths = [
      ...Object.values(CHECK_INPUTS).flat(),
      ...PYTHON_ONLY_INPUTS,
    ].filter((path) => !path.startsWith(":"));
    const unknown = paths.some(
      (path) =>
        !/^(?:docs\/.*\.md|[^/]+\.md|packages\/[^/]+\/[^/]+\.md)$/u.test(
          path,
        ) &&
        !knownPaths.some(
          (known) => path === known || path.startsWith(`${known}/`),
        ) &&
        !/^src\/.+\.(?:js|css|html)$/u.test(path),
    );
    const orchestration = paths.some(
      (path) =>
        path.startsWith(".github/workflows/") ||
        path.startsWith(".github/actions/") ||
        /^(?:scripts\/(?:selectPullRequestChecks|evaluatePullRequestChecks|generatePullRequestCheckPlanValidator|pullRequestCheckPlanValidator|runPullRequestNodeChecks|pullRequestNodeFamilies)\.js|scripts\/pullRequestCheckPlan\.schema\.json|tests\/pr-node-checks\.test\.js)$/u.test(
          path,
        ),
    );
    scopes = Object.fromEntries(
      CORE_CHECK_SCOPE_NAMES.filter((name) =>
        Object.hasOwn(CHECK_INPUTS, name),
      ).map((name) => [
        name,
        unknown ||
          orchestration ||
          hasChanges(root, comparisonBase, revision, CHECK_INPUTS[name]),
      ]),
    );
    if (paths.some((path) => /^packages\/[^/]+\/README\.md$/u.test(path)))
      scopes.mcp_artifacts = true;
    scopes.mcp_application = scopes.mcp_artifacts;
    scopes.python_setup_tests =
      scopes.python_tests &&
      (unknown ||
        orchestration ||
        !paths.length ||
        !paths.every(isPythonOnlyInput));
    scopes.ci_control = controlOnly || unknown || orchestration;
    if (testFamilies)
      scopes = Object.fromEntries(
        CORE_CHECK_SCOPE_NAMES.map((name) => [name, name === "product_tests"]),
      );
    if (controlOnly)
      scopes = Object.fromEntries(
        CORE_CHECK_SCOPE_NAMES.map((name) => [name, name === "ci_control"]),
      );
  }
  // Application validation remains independent of the expensive downloadable
  // package matrix. Automatic package qualification never selects publication.
  scopes.mcp_artifacts = packageMode !== "disabled" && scopes.mcp_artifacts;
  scopes.mcp_release_qualification = packageMode === "manual";
  return assertCheckPlan({
    schemaVersion: 4,
    packageMode,
    mode: full ? "full" : "changed",
    revision,
    comparisonBase,
    scopes,
    requiredJobs: requiredJobsForScopes(scopes),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({
      options: {
        scope: { type: "string", multiple: true },
        "codeql-matrix": { type: "boolean" },
        plan: { type: "boolean" },
      },
      allowPositionals: false,
    });
    if (values.plan) {
      const plan = createCheckPlan();
      if (!process.env.GITHUB_OUTPUT)
        throw new Error("GITHUB_OUTPUT is required.");
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `plan=${JSON.stringify(plan)}\n`,
      );
      const summary = Object.entries(plan.scopes)
        .map(
          ([scope, selected]) =>
            `- ${scope}: ${selected ? "selected (matching input or conservative policy)" : "unselected (current input and package policy)"}`,
        )
        .join("\n");
      if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
    } else
      runFromGitHubEnvironment(
        process.env,
        values.scope ?? Object.keys(CHECK_INPUTS),
        { codeqlMatrix: values["codeql-matrix"] },
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
