import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ONTOLOGY_WORKFLOW = ".github/workflows/ontology-validation.yml";
const ONTOLOGY_WORKFLOW_SCOPES = [
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
  sdlc: [
    ...COMMON_INPUTS,
    ".sdlc",
    ".codex",
    "AGENTS.md",
    "REVIEW.md",
    "docs/sdlc",
    ":(exclude)docs/sdlc/baselines",
    ":(exclude)docs/sdlc/verification.md",
    ".python-version",
    "requirements-sdlc.txt",
    "requirements.txt",
    "requirements.lock.txt",
    "skills-lock.json",
    "scripts/validate_ontologies.py",
    "tests/test_validate_ontologies.py",
    ".github/workflows/sdlc-control-tests.yml",
    ".github/workflows/sdlc-pr.yml",
    ".github/workflows/sdlc-issue-acceptance.yml",
    ".github/ISSUE_TEMPLATE",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/CODEOWNERS",
    ".githooks",
    "scripts/configureGitHooks.js",
    "scripts/_commands.py",
    "scripts/_repository.py",
    "scripts/_sdlc_state.py",
    "scripts/_sdlc_resource_disposition.py",
    "scripts/_sdlc_baseline.py",
    "scripts/bootstrap_github_sdlc.py",
    "scripts/probe_dcg_hook_protocol.py",
    "scripts/runRepositoryPython.js",
    "scripts/sdlc.py",
    "scripts/sdlc_stop_gate.py",
    "scripts/set_up_sdlc.py",
    "scripts/set_up_agent_skills.py",
    "scripts/set_up_mcp_servers.py",
    "scripts/setUpDevelopmentEnvironment.js",
    "tests/sdlc",
    "tests/configure-git-hooks.test.js",
    "tests/set-up-development-environment.test.js",
    "tests/run-repository-python.test.js",
    "tests/sdlc-issue-acceptance.test.js",
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
    ":(exclude)tests/sdlc-issue-acceptance.test.js",
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

function readOntologyWorkflow(root, revision) {
  const entry = git(root, ["ls-tree", "-z", revision, "--", ONTOLOGY_WORKFLOW]);
  if (entry.status !== 0)
    throw new Error("Cannot read workflow tree: " + entry.stderr.trim());
  if (!entry.stdout || !/^100(?:644|755) blob /u.test(entry.stdout))
    return null;
  const source = git(root, ["show", `${revision}:${ONTOLOGY_WORKFLOW}`]);
  if (source.status !== 0)
    throw new Error("Cannot read workflow blob: " + source.stderr.trim());
  // Load the existing pinned parser only for workflow comparisons. Ordinary
  // path selection and CodeQL language selection require no npm installation.
  const { parseDocument } = require("yaml");
  const document = parseDocument(source.stdout, {
    uniqueKeys: true,
    stringKeys: true,
  });
  if (document.errors.length || document.warnings.length) {
    throw new Error(
      "Cannot safely parse ontology workflow: " +
        [...document.errors, ...document.warnings]
          .map((error) => error.message)
          .join("; "),
    );
  }
  return document.toJS({ maxAliasCount: 100 });
}

function selectOntologyWorkflowChanges(root, base, head) {
  const selected = Object.fromEntries(
    ONTOLOGY_WORKFLOW_SCOPES.map((name) => [name, false]),
  );
  if (!hasChanges(root, base, head, [ONTOLOGY_WORKFLOW])) return selected;
  const before = readOntologyWorkflow(root, base);
  const after = readOntologyWorkflow(root, head);
  const selectAll = () =>
    Object.fromEntries(ONTOLOGY_WORKFLOW_SCOPES.map((name) => [name, true]));
  const jobIds = ["policy-qa", "qualify", "validate-ontologies"];
  if (
    !before ||
    !after ||
    !isDeepStrictEqual(Object.keys(before.jobs ?? {}).sort(), jobIds) ||
    !isDeepStrictEqual(Object.keys(after.jobs ?? {}).sort(), jobIds)
  )
    return selectAll();
  const { jobs: beforeJobs, ...beforeShared } = before;
  const { jobs: afterJobs, ...afterShared } = after;
  if (
    !isDeepStrictEqual(beforeShared, afterShared) ||
    !isDeepStrictEqual(
      beforeJobs["validate-ontologies"],
      afterJobs["validate-ontologies"],
    )
  ) {
    return selectAll();
  }
  selected.ontology_qualification = !isDeepStrictEqual(
    beforeJobs.qualify,
    afterJobs.qualify,
  );
  if (!isDeepStrictEqual(beforeJobs["policy-qa"], afterJobs["policy-qa"])) {
    selected.ontology_entity_contracts = true;
    // Only the established entity-test run field has a narrower contract.
    // Changes to setup, conditions, environment or other steps run all QA.
    const withoutEntityCommand = (job) => {
      const copy = structuredClone(job);
      const matches = copy?.steps?.filter(
        (step) =>
          step.name === "Entity change and publication gate contracts" &&
          typeof step.run === "string",
      );
      if (matches?.length !== 1) return null;
      delete matches[0].run;
      return copy;
    };
    const beforeOther = withoutEntityCommand(beforeJobs["policy-qa"]);
    const afterOther = withoutEntityCommand(afterJobs["policy-qa"]);
    selected.ontology_policy_qa =
      !beforeOther ||
      !afterOther ||
      !isDeepStrictEqual(beforeOther, afterOther);
  }
  return selected;
}

export function selectPullRequestChecks({
  root = REPOSITORY_ROOT,
  base,
  head,
  scopes = Object.keys(CHECK_INPUTS),
}) {
  requireCommit(root, base);
  requireCommit(root, head);
  const workflowChanges = scopes.some((name) =>
    ONTOLOGY_WORKFLOW_SCOPES.includes(name),
  )
    ? selectOntologyWorkflowChanges(root, base, head)
    : {};
  const selected = {};
  for (const name of scopes) {
    const paths = CHECK_INPUTS[name];
    if (!paths) throw new Error("Unknown check scope: " + name);
    selected[name] =
      hasChanges(root, base, head, paths) || workflowChanges[name] === true;
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
        (needed ? "selected" : "not applicable; inputs unchanged"),
    ),
    "",
  ].join("\n");
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, report);
  return selected;
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
      },
      allowPositionals: false,
    });
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
