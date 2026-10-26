import * as nodeFileSystem from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

import { verifyUniversalOntologyMcpDistributionWorkflow } from "../../scripts/distribution/verifyUniversalOntologyMcpDistributionWorkflow.js";
import { UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_REVISION } from "../../packages/universal-ontology-mcp-server/src/universalOntologyMcpMetadata.js";

test("release protocol declaration conforms to the current MCP contract", async () => {
  const inputs = await readUniversalOntologyMcpReleaseInputs();
  expect(inputs.modelContextProtocol.revision).toBe(
    UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_REVISION,
  );
});

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
  complete: { contents: "read" },
});
const EXPECTED_JOB_DEPENDENCIES = Object.freeze({
  scope: [],
  validate: ["scope"],
  archive: ["scope", "validate"],
  container: ["scope", "validate"],
  assemble: ["archive", "container", "scope", "validate"],
  complete: ["archive", "assemble", "container", "scope", "validate"],
});
const ACTIVE_ACTION_NAMES = Object.freeze([
  "actions/checkout",
  "actions/download-artifact",
  "actions/setup-node",
  "actions/upload-artifact",
]);
const EXACT_NPM_BOOTSTRAP = "node scripts/installRepositoryNpm.js";

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

  test.each([
    { name: "matching product versions", rootVersion: "1.0.0", exitCode: 0 },
    { name: "independent root version", rootVersion: "99.0.0", exitCode: 0 },
    {
      name: "Registry version mismatch",
      rootVersion: "99.0.0",
      registryVersion: "99.0.0",
      exitCode: 1,
    },
    {
      name: "Registry package version mismatch",
      rootVersion: "99.0.0",
      registryPackageVersion: "99.0.0",
      exitCode: 1,
    },
    {
      name: "npm toolchain mismatch",
      rootVersion: "99.0.0",
      npmVersion: "0.0.0",
      exitCode: 1,
    },
  ])("executes the actual candidate metadata step: $name", async (scenario) => {
    const repositoryPath = fileURLToPath(new URL("../../", import.meta.url));
    const runtimePath = join(repositoryPath, ".sdlc", "runtime");
    await nodeFileSystem.mkdir(runtimePath, { recursive: true });
    const fixturePath = await nodeFileSystem.mkdtemp(
      join(runtimePath, "mcp-candidate-metadata-test-"),
    );
    const outputPath = join(fixturePath, "github-output.txt");
    const body =
      /^node --input-type=module <<'NODE'\n([\s\S]+)\nNODE\n?$/u.exec(
        workflow.jobs.validate.steps.find(
          ({ id }) => id === "candidate-metadata",
        ).run,
      )?.[1];
    expect(body).toBeDefined();
    const registry = {
      name: "io.github.hadden-industries/universal-ontology",
      version: scenario.registryVersion ?? "1.0.0",
      packages: [
        {
          registryType: "npm",
          version: scenario.registryPackageVersion ?? "1.0.0",
        },
      ],
    };
    try {
      for (const [path, value] of [
        [
          "package.json",
          {
            version: scenario.rootVersion,
            packageManager: `npm@${scenario.npmVersion ?? "12.2.0"}`,
          },
        ],
        [
          "packages/universal-ontology-mcp-server/package.json",
          { version: "1.0.0", mcpName: registry.name },
        ],
        ["server.json", registry],
        [
          "scripts/distribution/universalOntologyMcpReleaseInputs.json",
          {
            selectedNpmVersion: "12.2.0",
            nodeRuntime: {
              targets: [
                {
                  targetName: "fixture-target",
                  runnerLabel: "fixture-runner",
                  releaseArchiveFormat: "zip",
                },
              ],
            },
          },
        ],
      ]) {
        const targetPath = join(fixturePath, path);
        await nodeFileSystem.mkdir(dirname(targetPath), { recursive: true });
        await nodeFileSystem.writeFile(targetPath, JSON.stringify(value));
      }
      const result = spawnSync(
        process.execPath,
        ["--input-type=module", "--eval", body],
        {
          cwd: fixturePath,
          env: { ...process.env, GITHUB_OUTPUT: outputPath },
          encoding: "utf8",
          timeout: 10_000,
          windowsHide: true,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(scenario.exitCode);
      if (scenario.exitCode === 0) {
        const epoch = execFileSync(
          "git",
          ["show", "-s", "--format=%ct", "HEAD"],
          { cwd: repositoryPath, encoding: "utf8", windowsHide: true },
        ).trim();
        expect(await nodeFileSystem.readFile(outputPath, "utf8")).toBe(
          `software-version=1.0.0\nsource-date-epoch=${epoch}\ntarget-matrix=[{"targetName":"fixture-target","runnerLabel":"fixture-runner","releaseArchiveFormat":"zip"}]\n`,
        );
      } else {
        expect(result.stderr).toContain(
          scenario.npmVersion
            ? "Development toolchain or future Registry identity disagrees."
            : "Development candidate versions disagree.",
        );
        await expect(nodeFileSystem.stat(outputPath)).rejects.toMatchObject({
          code: "ENOENT",
        });
      }
    } finally {
      await nodeFileSystem.rm(fixturePath, { recursive: true, force: true });
    }
  });

  test("selects checks within PR, main-push and manual verification runs", () => {
    expect(workflow.name).toBe("Verify Universal Ontology MCP Distribution");
    expect(workflow.permissions).toEqual({});
    expect(Object.keys(workflow.on)).toEqual(["workflow_call"]);
    expect(workflow.on.workflow_call.inputs.plan).toEqual({
      required: true,
      type: "string",
    });
    expect(workflow.concurrency).toBeUndefined();
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
      "needs.scope.outputs.product_tests == 'true' || needs.scope.outputs.mcp_application == 'true' || needs.scope.outputs.mcp_artifacts == 'true' || needs.scope.outputs.website_build == 'true' || needs.scope.outputs.mcp_docs == 'true'",
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
      mcp_application: "${{ steps.scope.outputs.mcp_application }}",
      website_build: "${{ steps.scope.outputs.website_build }}",
      mcp_docs: "${{ steps.scope.outputs.mcp_docs }}",
    });
    expect(scope.steps[0].with).toEqual({
      "fetch-depth": 0,
      "persist-credentials": false,
      ref: "${{ github.sha }}",
    });
    expect(scope.steps.at(-1)).toMatchObject({
      id: "scope",
      run: "node scripts/evaluatePullRequestChecks.js --scopes",
    });
    expect(concatenateRunScripts(scope)).not.toMatch(/\bnpm\b/u);
  });

  test("separates product, documentation, website and MCP artifact work", () => {
    const steps = workflow.jobs.validate.steps;
    const byName = (name) => steps.find((step) => step.name === name);
    expect(byName("Run product regression and static checks")).toBeUndefined();
    expect(byName("Check MCP documentation")).toMatchObject({
      if: "needs.scope.outputs.mcp_docs == 'true' && needs.scope.outputs.product_tests != 'true' && needs.scope.outputs.mcp_artifacts != 'true' && needs.scope.outputs.website_build != 'true'",
      run: "npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-documentation.test.js\n",
    });
    expect(
      byName("Build the affected website and generators without auto-fixes"),
    ).toBeUndefined();
    expect(byName("Build the affected MCP application bundle")).toMatchObject({
      if: "needs.scope.outputs.mcp_application == 'true'",
      run: "npm run build:mcp-package",
    });
    expect(steps.find(({ id }) => id === "candidate-metadata")?.if).toBe(
      "needs.scope.outputs.mcp_artifacts == 'true'",
    );
    expect(concatenateRunScripts(workflow.jobs.validate)).not.toMatch(
      /(?:^|\s)npm run build(?:\s|$)/,
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
      if (jobName === "scope" || jobName === "complete") {
        expect(job.steps[setupNodeIndex].with).toEqual({
          "node-version-file": ".node-version",
          "package-manager-cache": false,
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
    expect(validateScripts).not.toContain("npm run test:node");
    expect(validateScripts).not.toContain("npm run lint:node");
    expect(validateScripts).not.toContain("npm run format:node:check");
    expect(validateScripts).toContain("npm test -- --runInBand");
    expect(validateScripts).not.toContain(
      "smokeTestUniversalOntologyMcpPublicArtifactOrigin.js",
    );
    expect(archiveScripts).toContain("build:mcp-platform-archives");
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
    expect(assembleScripts).toContain("generate:mcp-sbom");
    expect(assembleScripts).toContain("verify:mcp-release");
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

describe("distribution workflow concurrency policy", () => {
  test("accepts the approved workflow without constructing release artifacts", async () => {
    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).resolves.toEqual({ verifiedJobCount: 6 });
  });

  test.each([
    ["unconditional non-PR cancellation", "cancel-in-progress", true],
    [
      "a shared non-PR group that replaces pending runs",
      "group",
      "universal-ontology-mcp-distribution-${{ github.ref }}",
    ],
    [
      "a group shared by rerun attempts",
      "group",
      "universal-ontology-mcp-distribution-${{ github.event_name }}-${{ github.event.pull_request.number || github.run_id }}",
    ],
  ])("rejects %s", async (_caseName, setting, value) => {
    // Workflow-only policy needs no package/SBOM fixture or installed npm graph.
    const workflow = parseYaml(
      await nodeFileSystem.readFile(WORKFLOW_URL, "utf8"),
    );
    expect(workflow.concurrency).toBeUndefined();
    workflow.concurrency = {};
    workflow.concurrency[setting] = value;
    const fixturePath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-workflow-concurrency-"),
    );
    try {
      const distributionWorkflowPath = join(fixturePath, "workflow.yml");
      await nodeFileSystem.writeFile(
        distributionWorkflowPath,
        stringifyYaml(workflow),
      );
      await expect(
        verifyUniversalOntologyMcpDistributionWorkflow({
          distributionWorkflowPath,
          releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
        }),
      ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
    } finally {
      await nodeFileSystem.rm(fixturePath, { recursive: true, force: true });
    }
  });
});

describe("MCP distribution executable-policy verification", () => {
  let fixtureParentDirectoryPath;
  beforeAll(async () => {
    fixtureParentDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-workflow-policy-"),
    );
  });
  afterAll(async () => {
    await nodeFileSystem.rm(fixtureParentDirectoryPath, {
      recursive: true,
      force: true,
    });
  });

  async function writeMutatedDistributionWorkflow(
    caseName,
    mutateWorkflowText,
  ) {
    const sourceWorkflowText = await nodeFileSystem.readFile(
      WORKFLOW_URL,
      "utf8",
    );
    const mutatedWorkflowText = mutateWorkflowText(sourceWorkflowText);
    if (mutatedWorkflowText === sourceWorkflowText) {
      throw new Error(`Workflow mutation did not apply for ${caseName}.`);
    }

    const distributionWorkflowPath = join(
      fixtureParentDirectoryPath,
      `${caseName}.yml`,
    );
    await nodeFileSystem.writeFile(
      distributionWorkflowPath,
      mutatedWorkflowText,
    );
    return distributionWorkflowPath;
  }

  function insertValidateJobStep(workflowText, stepLines) {
    return workflowText.replace(
      "        run: npm ci --ignore-scripts",
      ["        run: npm ci --ignore-scripts", "", ...stepLines].join("\n"),
    );
  }

  test("rejects any unapproved addition to the workflow step topology", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "additional-benign-step",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Run an otherwise benign additional command",
          "        run: node --version",
        ]),
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
  });

  test("rejects any unapproved change to an approved run script", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "modified-approved-run-script",
      (workflowText) =>
        workflowText.replace(
          "        run: npm run build:mcp-package\n",
          [
            "        run: |",
            "          npm run build:mcp-package",
            "          node --version",
            "",
          ].join("\n"),
        ),
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
  });

  test("accepts presentation-only workflow comments and mapping reordering", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "presentation-only-workflow-changes",
      (workflowText) => {
        const parsedWorkflow = parseYaml(workflowText);

        // Mapping order is not part of YAML's data model. Exercise mappings
        // checked both as policy values and as explicit topology key sets.
        parsedWorkflow.jobs = {
          complete: parsedWorkflow.jobs.complete,
          assemble: parsedWorkflow.jobs.assemble,
          container: parsedWorkflow.jobs.container,
          archive: parsedWorkflow.jobs.archive,
          validate: parsedWorkflow.jobs.validate,
          scope: parsedWorkflow.jobs.scope,
        };
        for (const jobName of ["archive", "assemble"]) {
          const uploadStep = parsedWorkflow.jobs[jobName].steps.find(
            ({ uses }) =>
              typeof uses === "string" &&
              uses.startsWith("actions/upload-artifact@"),
          );
          uploadStep.with = {
            "retention-days": uploadStep.with["retention-days"],
            path: uploadStep.with.path,
            name: uploadStep.with.name,
            "if-no-files-found": uploadStep.with["if-no-files-found"],
          };
        }

        return [
          "# Security note: never expose ${{ secrets }} from this workflow.",
          stringifyYaml(parsedWorkflow),
        ].join("\n");
      },
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).resolves.toEqual({ verifiedJobCount: 6 });
  });

  test.each([
    [
      "a missing job timeout",
      (workflow) => {
        delete workflow.jobs.archive["timeout-minutes"];
      },
    ],
    [
      "an unapproved job timeout increase",
      (workflow) => {
        workflow.jobs.assemble["timeout-minutes"] = 360;
      },
    ],
    [
      "write permission in the scope job",
      (workflow) => {
        workflow.jobs.scope.permissions.contents = "write";
      },
    ],
    [
      "an archive job without the scope dependency",
      (workflow) => {
        workflow.jobs.archive.needs = ["validate"];
      },
    ],
    [
      "an unconditional archive job",
      (workflow) => {
        delete workflow.jobs.archive.if;
      },
    ],
  ])("rejects %s", async (caseName, mutateWorkflow) => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      caseName.replaceAll(" ", "-"),
      (workflowText) => {
        const workflow = parseYaml(workflowText);
        mutateWorkflow(workflow);
        return stringifyYaml(workflow);
      },
    );
    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
  });

  test("rejects a distribution workflow whose action ref leaves the full-SHA allowlist", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "tampered-action-reference",
      (workflowText) =>
        workflowText.replace(
          "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
          "actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow|action/iu);
  });

  test("rejects a container job that no longer performs an MCP initialization smoke", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "missing-container-mcp-initialization",
      (workflowText) =>
        workflowText.replace(
          "await client.connect(transport)",
          "await client.connect_disabled(transport)",
        ),
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow|container|MCP|initialization/iu);
  });

  test.each([
    [
      "a secret context hidden behind a neutral environment name",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Read a secret through a neutral environment name",
          "        env:",
          "          TOKEN: ${{ secrets.NPM_TOKEN }}",
          "        run: node --version",
        ]),
    ],
    [
      "an indirectly referenced secret context",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Serialize the secret context",
          "        env:",
          "          TOKEN_MAP: ${{ toJSON(secrets) }}",
          "        run: node --version",
        ]),
    ],
    [
      "option-bearing npm publication",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through an option-bearing npm command",
          "        run: npm --workspace universal-ontology-mcp-server publish --provenance=false",
        ]),
    ],
    [
      "folded option-bearing npm publication",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through a folded npm command",
          "        run: >-",
          "          npm --workspace universal-ontology-mcp-server",
          "          publish --provenance=false",
        ]),
    ],
    [
      "the shortest accepted npm publication abbreviation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through an npm abbreviation",
          "        run: npm pu",
        ]),
    ],
    [
      "Docker's image-push command form",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push an OCI image through the image command group",
          "        run: docker image push example.invalid/universal-ontology-mcp-server:development",
        ]),
    ],
    [
      "Docker Buildx's push flag",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push an OCI image through Docker Buildx",
          "        run: docker buildx build --push --tag example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker's top-level Buildx build alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise a top-level Docker build alias",
          "        run: docker build --push --tag example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker's image-group Buildx build alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise an image-group Docker build alias",
          "        run: docker image build --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's abbreviated build command",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise the abbreviated Buildx build command",
          "        run: docker buildx b --cache-to=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's registry output",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export an OCI image to a registry through Docker Buildx",
          "        run: docker buildx build --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's quoted registry output type",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export an OCI image through a quoted Docker Buildx output type",
          '        run: docker buildx build --output type="registry",name=example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker Buildx's attached short output option",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise an attached Buildx output option",
          "        run: docker buildx build -otype=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's combined quiet and output options",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise combined Buildx short options",
          "        run: docker buildx build -qotype=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's combined short options with a following output value",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a combined short option from its next argument",
          "        run: docker buildx build -qo type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's opaque output descriptor",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a Buildx output descriptor at execution time",
          "        env:",
          "          OUTPUT_DESCRIPTOR: type=registry,name=example.invalid/universal-ontology-mcp-server:development",
          '        run: docker buildx build --output "$OUTPUT_DESCRIPTOR" .',
        ]),
    ],
    [
      "Docker Buildx's pushed image output",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export and push an OCI image through Docker Buildx",
          "        run: docker buildx build --output type=image,name=example.invalid/universal-ontology-mcp-server:development,push=true .",
        ]),
    ],
    [
      "Docker Buildx's remote registry cache export",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Docker Buildx cache to a registry",
          "        run: docker buildx build --cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's implicit registry cache export",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Docker Buildx cache through the registry shorthand",
          "        run: docker buildx build --cache-to=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's repeated effective cache exporter type",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Override a local cache exporter later in its descriptor",
          "        run: docker buildx build --cache-to=type=local,type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's opaque cache exporter descriptor",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a Buildx cache descriptor at execution time",
          "        env:",
          "          CACHE_DESCRIPTOR: type=registry,ref=example.invalid/universal-ontology-mcp-cache:development",
          '        run: docker buildx build --cache-to "$CACHE_DESCRIPTOR" .',
        ]),
    ],
    [
      "Docker Buildx Bake's registry output override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Bake target to a registry",
          "        run: docker buildx bake --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker Buildx Bake's pushed image output override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push a Bake target image",
          "        run: docker buildx bake --set=*.output=type=image,push=true",
        ]),
    ],
    [
      "Docker Buildx Bake's registry cache override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Bake target cache to a registry",
          "        run: docker buildx bake --set '*.cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development'",
        ]),
    ],
    [
      "Docker's top-level Bake alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise a top-level Docker Bake alias",
          "        run: docker bake --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker Buildx's abbreviated Bake command",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise the abbreviated Buildx Bake command",
          "        run: docker buildx f --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker publication after a quoted semicolon",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a semicolon inside a Docker label",
          '        run: docker buildx build --label "note=a;b" --push --tag example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker publication after a quoted ampersand",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve an ampersand inside a Docker label",
          '        run: docker buildx build --label "note=a&b" --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker publication after a quoted pipe",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a pipe inside a Docker label",
          '        run: docker buildx build --label "note=a|b" --cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .',
        ]),
    ],
    [
      "Docker Bake after a quoted global-option separator",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a separator inside a Docker client path",
          '        run: docker --config "client;config" buildx bake',
        ]),
    ],
    [
      "npm publication hidden behind a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          npm ^",
          "            publish",
        ]),
    ],
    [
      "Docker publication whose executable is split by a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Split the Docker executable across a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          doc^",
          "          ker buildx build --push example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker publication whose push flag is split by a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Split a Buildx option across a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          docker buildx build --pu^",
          "          sh example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "indexed access to the GitHub token context",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Read the automatic token through index syntax",
          "        env:",
          "          TOKEN: ${{ github['token'] }}",
          "        run: node --version",
        ]),
    ],
  ])("rejects a workflow containing %s", async (caseName, mutateWorkflow) => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      caseName.replaceAll(" ", "-"),
      mutateWorkflow,
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/publication|remote-write/iu);
  });

  test.each([
    [
      "native archive upload path",
      "path: dist/releases/universal-ontology-mcp-server-v${{ needs.validate.outputs.software-version }}-${{ matrix.targetName }}.${{ matrix.releaseArchiveFormat }}",
    ],
    ["assembled candidate upload path", "path: dist/releases/*"],
  ])("rejects a narrowed %s", async (caseName, exactUploadPath) => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      caseName.replaceAll(" ", "-"),
      (workflowText) =>
        workflowText.replace(exactUploadPath, "path: dist/releases/SHA256SUMS"),
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).rejects.toThrow(/workflow|upload|artifact/iu);
  });
});
