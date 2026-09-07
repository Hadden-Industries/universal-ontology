import * as nodeFileSystem from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

const WORKFLOW_URL = new URL(
  "../../.github/workflows/verify-universal-ontology-mcp-distribution.yml",
  import.meta.url,
);

const EXPECTED_JOB_PERMISSIONS = Object.freeze({
  scope: { contents: "read" },
  validate: { contents: "read" },
  archive: { contents: "read" },
  container: { contents: "read" },
  assemble: { contents: "read" },
});
const EXPECTED_JOB_DEPENDENCIES = Object.freeze({
  scope: [],
  validate: ["scope"],
  archive: ["scope", "validate"],
  container: ["scope", "validate"],
  assemble: ["archive", "container", "scope", "validate"],
});
const ACTIVE_ACTION_NAMES = Object.freeze([
  "actions/checkout",
  "actions/download-artifact",
  "actions/setup-node",
  "actions/upload-artifact",
]);
const EXACT_NPM_BOOTSTRAP =
  'npm install --global --no-audit --no-fund npm@12.0.2\ntest "$(npm --version)" = "12.0.2"\n';

// The archive matrix places shell steps on macOS runners, whose BSD userland
// supplies these commands with short flags only. A GNU long option survives
// review and every Linux job, then fails the macOS targets at runtime, so the
// portable spelling is asserted here instead. Commands absent from this list
// either come from GNU-compatible implementations on macOS, such as libarchive
// `tar` and BSD `grep`, or are not part of the base userland at all.
const BSD_SHORT_OPTION_ONLY_COMMANDS = Object.freeze([
  "basename",
  "chmod",
  "chown",
  "cp",
  "cut",
  "date",
  "dirname",
  "du",
  "head",
  "ln",
  "mkdir",
  "mktemp",
  "mv",
  "readlink",
  "rm",
  "sed",
  "seq",
  "stat",
  "tail",
  "touch",
  "tr",
  "uniq",
  "wc",
]);

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
  return (Array.isArray(needs) ? [...needs] : [needs]).sort();
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

  test("selects checks within PR, main-push and manual verification runs", () => {
    expect(workflow.name).toBe("Verify Universal Ontology MCP Distribution");
    expect(workflow.permissions).toEqual({});
    expect(workflow.on).toEqual({
      pull_request: null,
      push: {
        branches: ["main"],
      },
      workflow_dispatch: null,
    });
    expect(workflow.on.push.tags).toBeUndefined();
    expect(workflow.concurrency).toEqual({
      group: "universal-ontology-mcp-distribution-${{ github.ref }}",
      "cancel-in-progress": true,
    });
  });

  test("defines the read-only scope job and four conditional verification jobs", () => {
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
    expect(workflow.jobs.validate.if).toBe(
      "needs.scope.outputs.product_tests == 'true' || needs.scope.outputs.mcp_artifacts == 'true' || needs.scope.outputs.website_build == 'true' || needs.scope.outputs.mcp_docs == 'true'",
    );
    for (const name of ["archive", "container", "assemble"]) {
      expect(workflow.jobs[name].if).toBe(
        "needs.scope.outputs.mcp_artifacts == 'true'",
      );
    }
  });

  test("determines applicability before npm installation and reports each scope", () => {
    const scope = workflow.jobs.scope;
    expect(scope.outputs).toEqual({
      product_tests: "${{ steps.scope.outputs.product_tests }}",
      mcp_artifacts: "${{ steps.scope.outputs.mcp_artifacts }}",
      website_build: "${{ steps.scope.outputs.website_build }}",
      mcp_docs: "${{ steps.scope.outputs.mcp_docs }}",
    });
    expect(scope.steps[0].with).toEqual({
      "fetch-depth": 0,
      "persist-credentials": false,
    });
    expect(scope.steps.at(-1)).toMatchObject({
      id: "scope",
      run: "node scripts/selectPullRequestChecks.js --scope product_tests --scope mcp_artifacts --scope website_build --scope mcp_docs",
    });
    expect(concatenateRunScripts(scope)).not.toMatch(/\bnpm\b/u);
  });

  test("separates product, documentation, website and MCP artifact work", () => {
    const steps = workflow.jobs.validate.steps;
    const byName = (name) => steps.find((step) => step.name === name);
    expect(byName("Run product regression and static checks")?.if).toBe(
      "needs.scope.outputs.product_tests == 'true' || needs.scope.outputs.mcp_artifacts == 'true' || needs.scope.outputs.website_build == 'true'",
    );
    expect(byName("Check MCP documentation")).toMatchObject({
      if: "needs.scope.outputs.mcp_docs == 'true' && needs.scope.outputs.product_tests != 'true' && needs.scope.outputs.mcp_artifacts != 'true' && needs.scope.outputs.website_build != 'true'",
      run: "npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-documentation.test.js\nnpm run format:check\n",
    });
    expect(
      byName("Build the affected website and generators without auto-fixes"),
    ).toMatchObject({
      if: "needs.scope.outputs.website_build == 'true'",
      run: "node node_modules/vite/bin/vite.js build",
    });
    expect(byName("Build the affected MCP application bundle")).toMatchObject({
      if: "needs.scope.outputs.mcp_artifacts == 'true'",
      run: "npm run mcp:package:build",
    });
    expect(steps.find(({ id }) => id === "candidate-metadata")?.if).toBe(
      "needs.scope.outputs.mcp_artifacts == 'true'",
    );
    expect(concatenateRunScripts(workflow.jobs.validate)).not.toContain(
      "npm run build",
    );
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
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
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
      if (jobName === "scope") {
        expect(job.steps[setupNodeIndex].with).toEqual({
          "node-version-file": ".node-version",
        });
        expect(bootstrapIndex).toBe(-1);
        expect(npmOperationIndices).toEqual([]);
        continue;
      }
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

  test("spells every shell option portably for BSD and GNU userland", () => {
    const macOsRunnerLabels = releaseInputs.nodeRuntime.targets
      .map(({ runnerLabel }) => runnerLabel)
      .filter((runnerLabel) => runnerLabel.startsWith("macos-"));

    expect(macOsRunnerLabels.length).toBeGreaterThan(0);

    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      const jobScripts = concatenateRunScripts(job);

      for (const command of BSD_SHORT_OPTION_ONLY_COMMANDS) {
        // Anchoring to the start of a simple command keeps a subcommand of
        // the same name, such as `docker volume rm --force`, out of the scan,
        // and the lookahead keeps a longer command that merely starts with
        // one of these names, such as `trap`, out of it as well.
        const longOptionUses =
          jobScripts.match(
            new RegExp(
              String.raw`(?:^|[;&|(])[ \t]*${command}(?=[ \t])[^\r\n;&|]*?\s--[A-Za-z]`,
              "gmu",
            ),
          ) ?? [];

        expect({ jobName, command, longOptionUses }).toEqual({
          jobName,
          command,
          longOptionUses: [],
        });
      }
    }
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
