import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isScalar, parseDocument, visit } from "yaml";

import { runnerPolicy } from "./repositoryRunnerPolicy.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const workflowPaths = {
  "codeql.yml": [
    ["scope", "runs-on"],
    ["analyze", "runs-on"],
  ],
  "development-checks.yml": [
    ["scope", "runs-on"],
    ["documentation", "strategy", "matrix", "os", 0],
    ["json-quality", "strategy", "matrix", "os", 0],
    ["python-style", "runs-on"],
    ["python-tests", "strategy", "matrix", "os", 0],
    ["python-node-tests", "strategy", "matrix", "os", 0],
    ["agent-skills-lock", "runs-on"],
    ["style-tooling", "strategy", "matrix", "os", 0],
    ["checks", "strategy", "matrix", "os", 0],
    ["complete", "runs-on"],
  ],
  "manual-mcp-packages.yml": [
    ["validate", "runs-on"],
    ["draft", "runs-on"],
    ["complete", "runs-on"],
  ],
  "ontology-validation.yml": [
    ["validate-ontologies", "runs-on"],
    ["policy-qa", "runs-on"],
    ["qualify", "strategy", "matrix", "os", 0],
    ["complete", "runs-on"],
  ],
  "pr-validation.yml": [
    ["select", "runs-on"],
    ["node", "runs-on"],
    ["website", "runs-on"],
    ["gate", "runs-on"],
  ],
  "repository-checks.yml": [
    ["select", "runs-on"],
    ["node", "runs-on"],
    ["website", "runs-on"],
    ["gate", "runs-on"],
  ],
  "verify-universal-ontology-mcp-distribution.yml": [
    ["scope", "runs-on"],
    ["validate", "runs-on"],
    ["container", "runs-on"],
    ["assemble", "runs-on"],
    ["complete", "runs-on"],
  ],
};

function projectWorkflow(source, file, runner) {
  const document = parseDocument(source);
  if (document.errors.length) throw new Error(`Invalid workflow YAML: ${file}`);
  const managed = new Set();
  const edits = [];
  for (const relativePath of workflowPaths[file] ?? []) {
    const path = ["jobs", ...relativePath];
    const node = document.getIn(path, true);
    if (!isScalar(node) || typeof node.value !== "string")
      throw new Error(`Missing Ubuntu selector: ${file} ${path.join(".")}`);
    managed.add(node);
    if (node.value !== runner)
      edits.push([node.range[0], node.range[1], runner]);
  }
  visit(document, {
    Scalar(_key, node) {
      if (
        typeof node.value === "string" &&
        /\bubuntu-(?:latest|slim|\d+\.\d+)(?:-[\w-]+)?(?![\w-])/u.test(
          node.value,
        ) &&
        !managed.has(node)
      )
        throw new Error(`Unmanaged Ubuntu selector: ${file} ${node.value}`);
    },
  });
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, start) + replacement + source.slice(end);
  return source;
}

/** Update only current scheduling projections and preserve the release input layout. */
export function syncRunnerProjections({
  root = repositoryRoot,
  write = false,
} = {}) {
  const policy = runnerPolicy(root);
  const workflows = join(root, ".github/workflows");
  const files = readdirSync(workflows).filter((file) => /\.ya?ml$/u.test(file));
  for (const file of Object.keys(workflowPaths)) {
    if (!files.includes(file))
      throw new Error(`Missing workflow with an Ubuntu selector: ${file}`);
  }
  const changes = [];
  for (const file of files) {
    const target = join(workflows, file);
    const source = readFileSync(target, "utf8");
    const updated = projectWorkflow(source, file, policy.runner);
    if (source !== updated) changes.push([target, updated]);
  }

  const target = join(
    root,
    "scripts/distribution/universalOntologyMcpReleaseInputs.json",
  );
  const source = readFileSync(target, "utf8");
  let updated = source;
  for (const [name, runner] of [
    ["linux-x64", policy.runner],
    ["linux-arm64", policy.armRunner],
  ]) {
    const field = new RegExp(
      `("targetName": "${name}",\\s+"runnerLabel": ")[^"]+(")`,
      "gu",
    );
    if ([...source.matchAll(field)].length !== 1)
      throw new Error(`Missing unique release runner projection: ${name}`);
    updated = updated.replace(
      field,
      (_match, before, after) => before + runner + after,
    );
  }
  if (source !== updated) changes.push([target, updated]);
  if (!write && changes.length)
    throw new Error(
      "Stale Ubuntu projections; run node scripts/repositoryRunner.js --write.",
    );
  for (const [file, content] of changes) writeFileSync(file, content);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (
    process.argv.slice(2).some((arg) => arg !== "--check" && arg !== "--write")
  )
    throw new Error("Use --check or --write.");
  syncRunnerProjections({ write: process.argv.includes("--write") });
}
