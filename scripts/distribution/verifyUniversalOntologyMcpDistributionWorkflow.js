import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { readWorkflowDocument } from "../readWorkflowDocument.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_DISTRIBUTION_WORKFLOW_PATH = join(
  REPOSITORY_ROOT_PATH,
  ".github",
  "workflows",
  "verify-universal-ontology-mcp-distribution.yml",
);

const EXPECTED_WORKFLOW_JOB_PERMISSIONS = Object.freeze({
  scope: { contents: "read" },
  validate: { contents: "read" },
  archive: { contents: "read" },
  container: { contents: "read" },
  assemble: { contents: "read" },
  complete: { contents: "read" },
});
const EXPECTED_WORKFLOW_JOB_DEPENDENCIES = Object.freeze({
  scope: [],
  validate: ["scope"],
  archive: ["scope", "validate"],
  container: ["scope", "validate"],
  assemble: ["archive", "container", "scope", "validate"],
  complete: ["archive", "assemble", "container", "scope", "validate"],
});
const ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES = Object.freeze([
  "actions/checkout",
  "actions/download-artifact",
  "actions/setup-node",
  "actions/upload-artifact",
]);
const EXPECTED_ARTIFACT_UPLOAD_INPUTS_BY_JOB_NAME = Object.freeze({
  archive: Object.freeze({
    name: "universal-ontology-mcp-server-${{ matrix.targetName }}",
    path: "dist/releases/universal-ontology-mcp-server-v${{ needs.validate.outputs.software-version }}-${{ matrix.targetName }}.${{ matrix.releaseArchiveFormat }}",
    "if-no-files-found": "error",
    "retention-days": 3,
  }),
  assemble: Object.freeze({
    name: "universal-ontology-mcp-server-development-candidate-${{ steps.candidate-identity.outputs.candidate-sha256 }}",
    path: "dist/releases/*",
    "if-no-files-found": "error",
    "retention-days": 3,
  }),
});
// This is the SHA-256 digest of the canonical JSON representation of the
// parsed workflow. Object-key order and YAML comments are intentionally
// excluded, while array order and every semantic value remain covered. The
// workflow is executable supply-chain policy: update this digest only after a
// deliberate review of every trigger, capability, job, action, and run script.
const EXPECTED_DISTRIBUTION_WORKFLOW_POLICY_MANIFEST_SHA256 =
  "f545b24e66b49520815380d3ba85382dc42ee743072f1119d2243c4c69aa9af6";

function compareBinaryText(leftText, rightText) {
  return Buffer.compare(Buffer.from(leftText), Buffer.from(rightText));
}

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeWorkflowJobDependencies(needs) {
  if (needs === undefined) {
    return [];
  }
  return (Array.isArray(needs) ? needs : [needs]).sort(compareBinaryText);
}

function requireExactJsonValue(actualValue, expectedValue, semanticName) {
  if (
    serializeCanonicalJsonValue(actualValue) !==
    serializeCanonicalJsonValue(expectedValue)
  ) {
    throw new Error(`Distribution workflow has incorrect ${semanticName}.`);
  }
}

/**
 * Serialize JSON-compatible data with recursively sorted object keys.
 *
 * YAML mapping order and comments are not executable semantics, so the policy
 * digest deliberately ignores them. Sequence order remains significant because
 * GitHub Actions executes jobs' steps in order.
 */
function serializeCanonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(serializeCanonicalJsonValue).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const members = Object.keys(value)
      .sort(compareBinaryText)
      .map(
        (propertyName) =>
          `${JSON.stringify(propertyName)}:${serializeCanonicalJsonValue(value[propertyName])}`,
      );
    return `{${members.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Treat the development distribution workflow as executable supply-chain
 * policy. Validation is intentionally independent of GitHub's permissive YAML
 * acceptance so a broadened trigger, permission, dependency edge, action ref,
 * or publication command fails before a candidate can be retained remotely.
 */
export async function verifyUniversalOntologyMcpDistributionWorkflow({
  distributionWorkflowPath = DEFAULT_DISTRIBUTION_WORKFLOW_PATH,
  releaseInputs,
}) {
  const workflow = await readWorkflowDocument(distributionWorkflowPath);
  const workflowPolicyManifestSha256 = calculateSha256(
    Buffer.from(serializeCanonicalJsonValue(workflow), "utf8"),
  );
  if (
    workflowPolicyManifestSha256 !==
    EXPECTED_DISTRIBUTION_WORKFLOW_POLICY_MANIFEST_SHA256
  ) {
    throw new Error(
      "Distribution workflow publication-policy manifest does not match its reviewed semantic digest.",
    );
  }
  requireExactJsonValue(
    workflow.name,
    "Verify Universal Ontology MCP Distribution",
    "display name",
  );
  requireExactJsonValue(workflow.permissions, {}, "default permissions");
  requireExactJsonValue(
    workflow["cache-mode"],
    "none",
    "candidate cache isolation",
  );
  requireExactJsonValue(
    workflow.defaults,
    { run: { shell: "bash" } },
    "portable shell defaults",
  );
  requireExactJsonValue(
    workflow.on,
    {
      workflow_call: {
        inputs: { plan: { required: true, type: "string" } },
        outputs: Object.fromEntries(
          [
            "verified-revision",
            "software-version",
            "candidate-sha256",
            "artifact-id",
            "artifact-digest",
          ].map((name) => [
            name,
            { value: "${{ jobs.complete.outputs." + name + " }}" },
          ]),
        ),
      },
    },
    "reusable consumer interface",
  );
  if (workflow.concurrency !== undefined)
    throw new Error("Distribution consumer must not own concurrency.");

  const expectedJobNames = Object.keys(EXPECTED_WORKFLOW_JOB_PERMISSIONS);
  requireExactJsonValue(
    Object.keys(workflow.jobs).sort(compareBinaryText),
    [...expectedJobNames].sort(compareBinaryText),
    "six-job topology",
  );
  requireExactJsonValue(
    Object.fromEntries(
      expectedJobNames.map((jobName) => [
        jobName,
        workflow.jobs[jobName]["timeout-minutes"],
      ]),
    ),
    {
      scope: 5,
      validate: 30,
      archive: 30,
      container: 30,
      assemble: 20,
      complete: 5,
    },
    "job timeout ceilings",
  );
  const allowedActionCommits = new Map(
    releaseInputs.githubActions.map(({ actionName, commitSha }) => [
      actionName,
      commitSha,
    ]),
  );
  const encounteredActionNames = new Set();
  const exactNpmBootstrap = `npm install --global --no-audit --no-fund npm@${releaseInputs.selectedNpmVersion}\ntest "$(npm --version)" = "${releaseInputs.selectedNpmVersion}"\n`;
  const artifactUploadStepCountsByJobName = {
    archive: 0,
    assemble: 0,
  };

  for (const jobName of expectedJobNames) {
    const job = workflow.jobs[jobName];
    requireExactJsonValue(
      job.permissions,
      EXPECTED_WORKFLOW_JOB_PERMISSIONS[jobName],
      `${jobName} permissions`,
    );
    requireExactJsonValue(
      normalizeWorkflowJobDependencies(job.needs),
      EXPECTED_WORKFLOW_JOB_DEPENDENCIES[jobName],
      `${jobName} dependency order`,
    );
    if (job.environment !== undefined) {
      throw new Error(
        `Distribution workflow job ${jobName} uses a protected publication environment.`,
      );
    }
    if (!Array.isArray(job.steps)) {
      throw new Error(`Distribution workflow job ${jobName} omits its steps.`);
    }

    const setupNodeIndex = job.steps.findIndex(({ uses }) =>
      uses?.startsWith("actions/setup-node@"),
    );
    const npmBootstrapIndex = job.steps.findIndex(
      ({ name }) => name === "Select exact npm CLI",
    );
    if (setupNodeIndex < 0) {
      throw new Error(
        `Distribution workflow job ${jobName} omits Node.js setup.`,
      );
    }
    if (jobName === "scope" || jobName === "complete") {
      requireExactJsonValue(
        job.steps[setupNodeIndex].with,
        {
          "node-version-file": ".node-version",
          "package-manager-cache": false,
        },
        `${jobName} Node.js version-file selection`,
      );
      if (npmBootstrapIndex !== -1) {
        throw new Error(
          "Distribution control jobs must run without installing npm.",
        );
      }
    } else if (
      serializeCanonicalJsonValue(job.steps[setupNodeIndex].with) !==
        serializeCanonicalJsonValue({
          "node-version": releaseInputs.nodeRuntime.version,
          "package-manager-cache": false,
        }) ||
      npmBootstrapIndex <= setupNodeIndex ||
      job.steps[npmBootstrapIndex].run !== exactNpmBootstrap
    ) {
      throw new Error(
        `Distribution workflow job ${jobName} does not select exact Node and npm versions first.`,
      );
    }

    for (let stepIndex = 0; stepIndex < job.steps.length; stepIndex += 1) {
      const step = job.steps[stepIndex];
      if (
        stepIndex !== npmBootstrapIndex &&
        typeof step.run === "string" &&
        /(^|\s)npm(?:\s|$)/mu.test(step.run) &&
        (npmBootstrapIndex < 0 || stepIndex < npmBootstrapIndex)
      ) {
        throw new Error(
          `Distribution workflow job ${jobName} invokes npm before its exact bootstrap.`,
        );
      }
      if (!step.uses) {
        continue;
      }
      const actionReferenceMatch = /^([^@]+)@([a-f0-9]{40})$/u.exec(step.uses);
      if (
        !actionReferenceMatch ||
        allowedActionCommits.get(actionReferenceMatch[1]) !==
          actionReferenceMatch[2] ||
        !ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES.includes(
          actionReferenceMatch[1],
        )
      ) {
        throw new Error(
          `Distribution workflow action ref leaves the active full-SHA allowlist: ${step.uses}`,
        );
      }
      encounteredActionNames.add(actionReferenceMatch[1]);
      if (
        actionReferenceMatch[1] === "actions/checkout" &&
        step.with?.["persist-credentials"] !== false
      ) {
        throw new Error(
          `Distribution workflow job ${jobName} retains checkout credentials.`,
        );
      }
      if (actionReferenceMatch[1] === "actions/upload-artifact") {
        const expectedUploadInputs =
          EXPECTED_ARTIFACT_UPLOAD_INPUTS_BY_JOB_NAME[jobName];
        if (!expectedUploadInputs) {
          throw new Error(
            `Distribution workflow job ${jobName} performs an unexpected artifact upload.`,
          );
        }
        artifactUploadStepCountsByJobName[jobName] += 1;
        requireExactJsonValue(
          step.with,
          expectedUploadInputs,
          `${jobName} artifact upload inputs`,
        );
      }
    }
  }
  requireExactJsonValue(
    [...encounteredActionNames].sort(compareBinaryText),
    [...ACTIVE_DISTRIBUTION_WORKFLOW_ACTION_NAMES].sort(compareBinaryText),
    "active action allowlist coverage",
  );
  requireExactJsonValue(
    artifactUploadStepCountsByJobName,
    { archive: 1, assemble: 1 },
    "artifact upload job allocation",
  );

  const concatenateRunScripts = (job) =>
    job.steps
      .filter(({ run }) => typeof run === "string")
      .map(({ run }) => run)
      .join("\n");
  const validateScripts = concatenateRunScripts(workflow.jobs.validate);
  const archiveScripts = concatenateRunScripts(workflow.jobs.archive);
  const containerScripts = concatenateRunScripts(workflow.jobs.container);
  const assembleScripts = concatenateRunScripts(workflow.jobs.assemble);
  if (
    validateScripts.includes(
      "smokeTestUniversalOntologyMcpPublicArtifactOrigin.js",
    ) ||
    !archiveScripts.includes("build:mcp-platform-archives") ||
    !containerScripts.includes(
      "docker build --tag universal-ontology-mcp-server:development",
    ) ||
    !containerScripts.includes("--network=none") ||
    !containerScripts.includes("--read-only") ||
    !containerScripts.includes("--cap-drop=ALL") ||
    !containerScripts.includes("no-new-privileges") ||
    !containerScripts.includes(
      'import { Client } from "@modelcontextprotocol/client"',
    ) ||
    !containerScripts.includes(
      'import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"',
    ) ||
    !containerScripts.includes("await client.connect(transport)") ||
    !containerScripts.includes("await client.listTools()") ||
    !containerScripts.includes("client.getServerVersion()") ||
    !containerScripts.includes("mcp-container-smoke") ||
    !containerScripts.includes("UNSAFE_CACHE_DIRECTORY") ||
    /(?:--publish|-p\s+\d)/u.test(containerScripts) ||
    !assembleScripts.includes("verify:mcp-release")
  ) {
    throw new Error(
      "Distribution workflow does not implement the exact local-only candidate checks.",
    );
  }
  return Object.freeze({ verifiedJobCount: expectedJobNames.length });
}
