import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const COMMON_INPUTS = [
  "scripts/selectPullRequestChecks.js",
  "tests/pr-check-scopes.test.js",
  ".node-version",
  "package.json",
  "package-lock.json",
];
export const CHECK_INPUTS = {
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
    "skills-lock.json",
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

export function selectPullRequestChecks({
  root = REPOSITORY_ROOT,
  base,
  head,
  scopes = Object.keys(CHECK_INPUTS),
}) {
  requireCommit(root, base);
  requireCommit(root, head);
  const selected = {};
  for (const name of scopes) {
    const paths = CHECK_INPUTS[name];
    if (!paths) throw new Error("Unknown check scope: " + name);
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
        "Cannot determine " + name + " applicability: " + result.stderr.trim(),
      );
    }
    selected[name] = result.status === 1;
  }
  return selected;
}

export function runFromGitHubEnvironment(
  env = process.env,
  scopes = Object.keys(CHECK_INPUTS),
) {
  if (
    !scopes.length ||
    scopes.some((name) => !Object.hasOwn(CHECK_INPUTS, name))
  ) {
    throw new Error("At least one known check scope is required.");
  }
  let selected;
  if (env.GITHUB_EVENT_NAME === "workflow_dispatch") {
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
      "PR check selection requires pull_request, a main push, or workflow_dispatch.",
    );
  }
  if (!env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
  appendFileSync(
    env.GITHUB_OUTPUT,
    Object.entries(selected)
      .map(([name, needed]) => name + "=" + needed + "\n")
      .join(""),
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
      options: { scope: { type: "string", multiple: true } },
      allowPositionals: false,
    });
    runFromGitHubEnvironment(
      process.env,
      values.scope ?? Object.keys(CHECK_INPUTS),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
