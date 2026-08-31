import * as nodeFileSystem from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

const WORKFLOW_URL = new URL(
  "../../.github/workflows/release-universal-ontology-mcp-server.yml",
  import.meta.url,
);

const EXPECTED_PATH_FILTERS = Object.freeze([
  ".github/workflows/release-universal-ontology-mcp-server.yml",
  "docs/mcp/**",
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
  assemble: { contents: "read" },
  "attest-and-draft": {
    contents: "write",
    "id-token": "write",
    attestations: "write",
    "artifact-metadata": "write",
  },
  "publish-npm": { contents: "read", "id-token": "write" },
  "publish-oci": {
    contents: "read",
    packages: "write",
    "id-token": "write",
  },
  "publish-github-release": { contents: "write" },
  "publish-mcp-registry": { contents: "read", "id-token": "write" },
});
const EXPECTED_JOB_DEPENDENCIES = Object.freeze({
  validate: [],
  archive: ["validate"],
  assemble: ["archive", "validate"],
  "attest-and-draft": ["assemble", "validate"],
  "publish-npm": ["attest-and-draft", "validate"],
  "publish-oci": ["attest-and-draft", "validate"],
  "publish-github-release": [
    "attest-and-draft",
    "publish-npm",
    "publish-oci",
    "validate",
  ],
  "publish-mcp-registry": ["publish-github-release", "validate"],
});
const RELEASE_ONLY_JOB_NAMES = Object.freeze([
  "attest-and-draft",
  "publish-npm",
  "publish-oci",
  "publish-github-release",
  "publish-mcp-registry",
]);
const EXACT_NPM_BOOTSTRAP =
  'npm install --global --no-audit --no-fund npm@12.0.2\ntest "$(npm --version)" = "12.0.2"\n';

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

describe("Universal Ontology MCP release workflow", () => {
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

  test("uses the exact path-scoped validation and semantic release triggers", () => {
    expect(workflow.name).toBe("Release Universal Ontology MCP Server");
    expect(workflow.permissions).toEqual({});
    expect(workflow.on).toEqual({
      pull_request: { paths: EXPECTED_PATH_FILTERS },
      push: {
        branches: ["**"],
        tags: ["universal-ontology-mcp-server-v*"],
        paths: EXPECTED_PATH_FILTERS,
      },
    });
    expect(workflow.concurrency).toEqual({
      group: "universal-ontology-mcp-server-${{ github.ref }}",
      "cancel-in-progress": false,
    });
    expect(workflowText).toContain(
      "^universal-ontology-mcp-server-v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$",
    );
  });

  test("defines the intended least-privilege eight-job dependency graph", () => {
    expect(Object.keys(workflow.jobs)).toEqual(
      Object.keys(EXPECTED_JOB_PERMISSIONS),
    );
    for (const [jobName, expectedPermissions] of Object.entries(
      EXPECTED_JOB_PERMISSIONS,
    )) {
      const job = workflow.jobs[jobName];
      expect(job.permissions).toEqual(expectedPermissions);
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
    expect(workflow.jobs["publish-npm"].environment).toBe("npm-publish");
    expect(workflow.jobs["publish-mcp-registry"].environment).toBe(
      "mcp-registry-publish",
    );
    for (const jobName of RELEASE_ONLY_JOB_NAMES) {
      expect(workflow.jobs[jobName].if).toContain(
        "needs.validate.outputs.is-release == 'true'",
      );
    }
  });

  test("pins every external action to the release-input allowlist", () => {
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
    expect([...encounteredActionNames].sort()).toEqual(
      [...allowedActions.keys()].sort(),
    );
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
      expect(job.steps[setupNodeIndex].with?.["node-version"]).toBe("24.20.0");
      expect(bootstrapIndex).toBeGreaterThan(setupNodeIndex);
      expect(job.steps[bootstrapIndex]).toMatchObject({
        shell: "bash",
        run: EXACT_NPM_BOOTSTRAP,
      });
      for (const npmOperationIndex of npmOperationIndices) {
        expect(npmOperationIndex).toBeGreaterThan(bootstrapIndex);
      }
      expect(npmOperationIndices.length).toBeGreaterThan(0);
      expect(jobName).toBeTruthy();
    }
  });

  test("gates writes behind public smoke, exact assembly, and verification", () => {
    const validateScripts = concatenateRunScripts(workflow.jobs.validate);
    const archiveScripts = concatenateRunScripts(workflow.jobs.archive);
    const assembleScripts = concatenateRunScripts(workflow.jobs.assemble);
    expect(validateScripts).toContain(
      "smokeTestUniversalOntologyMcpPublicArtifactOrigin.js",
    );
    expect(validateScripts).toContain("--artifact-channel=stable");
    expect(archiveScripts).toContain("mcp:archives:build");
    expect(archiveScripts).toContain("matrix.targetName");
    expect(archiveScripts).toContain("--version");
    expect(archiveScripts).toContain("--help");
    expect(assembleScripts).toContain("npm sbom");
    expect(assembleScripts).toContain("mcp:sbom:create");
    expect(assembleScripts).toContain("mcp:release:verify");
    expect(workflow.jobs.assemble.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uses: expect.stringMatching(
            /^actions\/upload-artifact@[a-f0-9]{40}$/u,
          ),
          with: expect.objectContaining({
            name: "universal-ontology-mcp-server-release-candidate",
            "retention-days": 3,
          }),
        }),
      ]),
    );
  });

  test("attests checksummed subjects and publishes in resumable immutable order", () => {
    const attestJob = workflow.jobs["attest-and-draft"];
    const attestSteps = attestJob.steps.filter(({ uses }) =>
      uses?.startsWith("actions/attest@"),
    );
    expect(attestSteps).toHaveLength(2);
    expect(attestSteps[0].with).toMatchObject({
      "subject-checksums": "dist/releases/SHA256SUMS",
    });
    expect(attestSteps[1].with).toMatchObject({
      "subject-checksums": "dist/releases/SHA256SUMS",
      "sbom-path":
        "dist/releases/universal-ontology-mcp-server-v1.0.0-release.spdx.json",
    });

    const draftScripts = concatenateRunScripts(attestJob);
    const npmScripts = concatenateRunScripts(workflow.jobs["publish-npm"]);
    const ociScripts = concatenateRunScripts(workflow.jobs["publish-oci"]);
    const githubReleaseScripts = concatenateRunScripts(
      workflow.jobs["publish-github-release"],
    );
    const registryScripts = concatenateRunScripts(
      workflow.jobs["publish-mcp-registry"],
    );
    expect(draftScripts).toContain("gh release create");
    expect(draftScripts).toContain("--draft");
    expect(draftScripts).toContain("compare");
    expect(npmScripts).toContain("npm publish");
    expect(npmScripts).toContain("--provenance");
    expect(npmScripts).toContain("dist.integrity");
    expect(npmScripts).not.toContain("NODE_AUTH_TOKEN");
    expect(
      workflow.jobs["publish-oci"].steps.find(({ id }) => id === "build-image")
        .with.outputs,
    ).toContain("push-by-digest=true");
    expect(ociScripts).toContain("steps.build-image.outputs.digest");
    expect(ociScripts).toContain("imagetools create");
    expect(ociScripts).not.toMatch(/(?:^|[-_:])latest(?:$|[-_:])/imu);
    expect(githubReleaseScripts).toContain("--draft=false");
    expect(registryScripts).toContain("mcp-publisher login github-oidc");
    expect(registryScripts).toContain("mcp-publisher publish server.json");
    expect(registryScripts).toContain(releaseInputs.mcpPublisher.archiveSha256);
    expect(registryScripts).toContain("curl --fail --location --output");
    expect(registryScripts).not.toMatch(/curl[^\n]*\|/u);
  });
});
