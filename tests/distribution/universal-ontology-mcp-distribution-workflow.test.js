import * as nodeFileSystem from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

const WORKFLOW_URL = new URL(
  "../../.github/workflows/verify-universal-ontology-mcp-distribution.yml",
  import.meta.url,
);

const EXPECTED_PATH_FILTERS = Object.freeze([
  ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
  "README.md",
  "docs/mcp/**",
  "docs/plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md",
  "package.json",
  "package-lock.json",
  "packages/universal-ontology-mcp-server/**",
  "scripts/build/createOntologyQueryArtifacts.js",
  "scripts/build/ontologyAssets.js",
  "scripts/distribution/**",
  "scripts/generateOntologyQueryIndexes.js",
  "scripts/runUniversalOntologyMcpStdioServer.js",
  "scripts/stageOntologyQueryArtifactChannel.js",
  "server.json",
  "src/mcp/**",
  "src/ontology.js",
  "src/ontologyQuery/**",
  "tests/distribution/**",
  "tests/mcp/**",
  "tests/ontology-query/**",
  "tests/webmcp/ontology-entity-definition-resolver.test.js",
]);
const EXPECTED_JOB_PERMISSIONS = Object.freeze({
  validate: { contents: "read" },
  archive: { contents: "read" },
  container: { contents: "read" },
  assemble: { contents: "read" },
});
const EXPECTED_JOB_DEPENDENCIES = Object.freeze({
  validate: [],
  archive: ["validate"],
  container: ["validate"],
  assemble: ["archive", "container", "validate"],
});
const ACTIVE_ACTION_NAMES = Object.freeze([
  "actions/checkout",
  "actions/download-artifact",
  "actions/setup-node",
  "actions/upload-artifact",
]);
const EXACT_NPM_BOOTSTRAP =
  'npm install --global --no-audit --no-fund npm@12.0.2\ntest "$(npm --version)" = "12.0.2"\n';

// These patterns cover every remote publication mechanism intentionally kept
// out of development. The positive artifact assertions below make the narrow
// GitHub Actions-artifact exception explicit rather than relying on omission.
const PROHIBITED_WORKFLOW_PATTERNS = Object.freeze([
  /actions\/attest@/u,
  /docker\/login-action@/u,
  /docker\/build-push-action@/u,
  /\bdocker[^\r\n;&|]*?[ \t]+(?:login|push)(?=[ \t\r\n;&|]|$)/imu,
  /\bdocker[^\r\n;&|]*?[ \t]+(?:build\b|buildx\b[^\r\n;&|]*?[ \t]+b\b)[^\r\n;&|]*?[ \t]+--push(?=[= \t\r\n;&|]|$)/imu,
  /\bdocker[^\r\n;&|]*?[ \t]+(?:build\b|buildx\b[^\r\n;&|]*?[ \t]+b\b)[^\r\n;&|]*?[ \t]+(?:--output|-o)(?:[ \t]*=[ \t]*|[ \t]+)[^\r\n;&|]*?\b(?:push[ \t]*=|type[ \t]*=[ \t]*registry\b)/imu,
  /\bdocker[^\r\n;&|]*?[ \t]+(?:build\b|buildx\b[^\r\n;&|]*?[ \t]+b\b)[^\r\n;&|]*?[ \t]+--cache-to(?:[ \t]*=[ \t]*|[ \t]+)(?!type[ \t]*=[ \t]*(?:inline|local)\b)[^\r\n;&|]+/imu,
  /\bdocker[^\r\n;&|]*?[ \t]+(?:bake\b|buildx\b[^\r\n;&|]*?[ \t]+(?:bake|f)\b)/imu,
  /\bgh\s+release\b/iu,
  /\bnpm[^\r\n;&|]*?[ \t]+pu(?:b(?:l(?:i(?:s(?:h)?)?)?)?)?(?=[ \t\r\n;&|]|$)/imu,
  /\bpush-by-digest\b/iu,
  /\bimagetools\s+create\b/iu,
  /\bmcp-publisher\s+(?:login|publish)\b/iu,
  /\b(?:aws|gcloud|gsutil)\s+/iu,
  /\b(?:GH_TOKEN|NODE_AUTH_TOKEN)\b/u,
  /\$\{\{[^}\r\n]*\bgithub\s*(?:\.token\b|\[\s*['"]token['"]\s*\])/iu,
  /\$\{\{[^}\r\n]*\bsecrets\b/iu,
  /\b(?:id-token|attestations|artifact-metadata|packages|contents):\s*write\b/iu,
  /\bregistry-url\s*:/iu,
]);

function normalizeNeeds(needs) {
  if (needs === undefined) {
    return [];
  }
  return (Array.isArray(needs) ? needs : [needs]).sort();
}

function concatenateRunScripts(job) {
  return job.steps
    .filter(({ run }) => typeof run === "string")
    .map(({ run }) => run)
    .join("\n");
}

/**
 * Render only parsed YAML keys and scalar values for defense-in-depth scans.
 *
 * Comments are presentation metadata rather than executable workflow policy.
 * Parsing before this traversal prevents a warning comment from looking like
 * a token reference or publication command while retaining mapping keys such
 * as `permissions.contents` for the prohibited-pattern checks.
 */
function concatenateWorkflowSemanticText(value) {
  if (Array.isArray(value)) {
    return value.map(concatenateWorkflowSemanticText).join("\n");
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value)
      .map(
        ([propertyName, propertyValue]) =>
          `${propertyName}: ${concatenateWorkflowSemanticText(propertyValue)}`,
      )
      .join("\n");
  }
  return String(value);
}

describe("Universal Ontology MCP development distribution workflow", () => {
  let workflow;
  let workflowText;
  let releaseInputs;

  beforeAll(async () => {
    [workflowText, releaseInputs] = await Promise.all([
      nodeFileSystem.readFile(WORKFLOW_URL, "utf8"),
      readUniversalOntologyMcpReleaseInputs(),
    ]);
    workflow = parseYaml(workflowText);
  });

  test("uses only path-scoped branch and pull-request verification triggers", () => {
    expect(workflow.name).toBe("Verify Universal Ontology MCP Distribution");
    expect(workflow.permissions).toEqual({});
    expect(workflow.on).toEqual({
      pull_request: { paths: EXPECTED_PATH_FILTERS },
      push: {
        branches: ["**"],
        paths: EXPECTED_PATH_FILTERS,
      },
    });
    expect(workflow.on.push.tags).toBeUndefined();
    expect(workflow.on.workflow_dispatch).toBeUndefined();
    expect(workflow.concurrency).toEqual({
      group: "universal-ontology-mcp-distribution-${{ github.ref }}",
      "cancel-in-progress": true,
    });
  });

  test("defines the exact read-only four-job dependency graph", () => {
    expect(Object.keys(workflow.jobs)).toEqual(
      Object.keys(EXPECTED_JOB_PERMISSIONS),
    );
    for (const [jobName, expectedPermissions] of Object.entries(
      EXPECTED_JOB_PERMISSIONS,
    )) {
      const job = workflow.jobs[jobName];
      expect(job.permissions).toEqual(expectedPermissions);
      expect(job.environment).toBeUndefined();
      expect(normalizeNeeds(job.needs)).toEqual(
        EXPECTED_JOB_DEPENDENCIES[jobName],
      );
    }
    expect(workflow.jobs.archive.strategy).toMatchObject({
      "fail-fast": false,
      matrix: {
        include: "${{ fromJSON(needs.validate.outputs.target-matrix) }}",
      },
    });
    expect(workflow.jobs.archive["runs-on"]).toBe("${{ matrix.runnerLabel }}");
  });

  test("pins every used external action without requiring inactive future pins", () => {
    const allowedActions = new Map(
      releaseInputs.githubActions.map(({ actionName, commitSha }) => [
        actionName,
        commitSha,
      ]),
    );
    const encounteredActionNames = new Set();

    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (!step.uses) {
          continue;
        }
        const match = /^([^@]+)@([a-f0-9]{40})$/u.exec(step.uses);
        expect(match).not.toBeNull();
        const [, actionName, commitSha] = match;
        expect(allowedActions.get(actionName)).toBe(commitSha);
        encounteredActionNames.add(actionName);
        if (actionName === "actions/checkout") {
          expect(step.with?.["persist-credentials"]).toBe(false);
        }
      }
    }
    expect([...encounteredActionNames].sort()).toEqual(ACTIVE_ACTION_NAMES);
  });

  test("selects exact Node and npm versions before every npm operation", () => {
    for (const job of Object.values(workflow.jobs)) {
      const setupNodeIndex = job.steps.findIndex(({ uses }) =>
        uses?.startsWith("actions/setup-node@"),
      );
      const bootstrapIndex = job.steps.findIndex(
        ({ name }) => name === "Select exact npm CLI",
      );
      const npmOperationIndices = job.steps
        .map(({ run }, index) => ({ run, index }))
        .filter(
          ({ run, index }) =>
            index !== bootstrapIndex &&
            typeof run === "string" &&
            /(^|\s)npm(?:\s|$)/mu.test(run),
        )
        .map(({ index }) => index);

      expect(setupNodeIndex).toBeGreaterThanOrEqual(0);
      expect(job.steps[setupNodeIndex].with?.["node-version"]).toBe("24.20.0");
      expect(bootstrapIndex).toBeGreaterThan(setupNodeIndex);
      expect(job.steps[bootstrapIndex]).toMatchObject({
        shell: "bash",
        run: EXACT_NPM_BOOTSTRAP,
      });
      expect(npmOperationIndices.length).toBeGreaterThan(0);
      for (const npmOperationIndex of npmOperationIndices) {
        expect(npmOperationIndex).toBeGreaterThan(bootstrapIndex);
      }
    }
  });

  test("builds native and container candidates without registry access", () => {
    const validateScripts = concatenateRunScripts(workflow.jobs.validate);
    const archiveScripts = concatenateRunScripts(workflow.jobs.archive);
    const containerScripts = concatenateRunScripts(workflow.jobs.container);

    expect(validateScripts).toContain("npm ci --ignore-scripts");
    expect(validateScripts).toContain("npm test -- --runInBand");
    expect(validateScripts).not.toContain(
      "smokeTestUniversalOntologyMcpPublicArtifactOrigin.js",
    );
    expect(archiveScripts).toContain("mcp:archives:build");
    expect(archiveScripts).toContain("matrix.targetName");
    expect(archiveScripts).toContain("--version");
    expect(archiveScripts).toContain("--help");
    expect(containerScripts).toContain(
      "docker build --tag universal-ontology-mcp-server:development",
    );
    expect(containerScripts).toContain("docker volume create");
    expect(containerScripts).toContain("--read-only");
    expect(containerScripts).toContain("--cap-drop=ALL");
    expect(containerScripts).toContain("no-new-privileges");
    expect(containerScripts).toContain(
      'import { Client } from "@modelcontextprotocol/client"',
    );
    expect(containerScripts).toContain(
      'import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"',
    );
    expect(containerScripts).toContain("await client.connect(transport)");
    expect(containerScripts).toContain("await client.listTools()");
    expect(containerScripts).toContain("client.getServerVersion()");
    expect(containerScripts).toContain("mcp-container-smoke");
    expect(containerScripts).toContain("UNSAFE_CACHE_DIRECTORY");
    expect(containerScripts).not.toContain('"method":"initialize"');
    expect(containerScripts).not.toMatch(/(?:--publish|-p\s+\d)/u);
  });

  test("retains only three-day GitHub Actions artifacts", () => {
    const archiveUploadStep = workflow.jobs.archive.steps.find(({ uses }) =>
      uses?.startsWith("actions/upload-artifact@"),
    );
    const assembleScripts = concatenateRunScripts(workflow.jobs.assemble);
    const candidateUploadStep = workflow.jobs.assemble.steps.find(({ uses }) =>
      uses?.startsWith("actions/upload-artifact@"),
    );

    expect(archiveUploadStep?.with).toEqual({
      name: "universal-ontology-mcp-server-${{ matrix.targetName }}",
      path: "dist/releases/universal-ontology-mcp-server-v${{ needs.validate.outputs.software-version }}-${{ matrix.targetName }}.${{ matrix.releaseArchiveFormat }}",
      "if-no-files-found": "error",
      "retention-days": 3,
    });
    expect(assembleScripts).toContain("npm sbom");
    expect(assembleScripts).toContain("mcp:sbom:create");
    expect(assembleScripts).toContain("mcp:release:verify");
    expect(candidateUploadStep?.with).toEqual({
      name: "universal-ontology-mcp-server-development-candidate-${{ steps.candidate-identity.outputs.candidate-sha256 }}",
      path: "dist/releases/*",
      "if-no-files-found": "error",
      "retention-days": 3,
    });
  });

  test("contains no public release, registry, attestation, or cloud write path", () => {
    const workflowSemanticText = concatenateWorkflowSemanticText(workflow);
    for (const prohibitedPattern of PROHIBITED_WORKFLOW_PATTERNS) {
      expect(workflowSemanticText).not.toMatch(prohibitedPattern);
    }
  });

  test("excludes YAML comments from executable-policy scans", () => {
    const workflowWithSecurityComment = parseYaml(
      [
        "# Security note: never expose ${{ secrets }} from this workflow.",
        workflowText,
      ].join("\n"),
    );

    expect(concatenateWorkflowSemanticText(workflowWithSecurityComment)).toBe(
      concatenateWorkflowSemanticText(workflow),
    );
  });
});
