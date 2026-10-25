import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { readWorkflowDocument } from "./readWorkflowDocument.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../", import.meta.url));
const POLICY_WORKFLOW_PATHS = Object.freeze([
  ".github/workflows/pr-validation.yml",
  ".github/workflows/full-qualification.yml",
  ".github/workflows/development-checks.yml",
  ".github/workflows/ontology-validation.yml",
  ".github/workflows/verify-universal-ontology-mcp-distribution.yml",
  ".github/workflows/manual-mcp-packages.yml",
  ".github/workflows/markdown-quality.yml",
]);

/**
 * Check repository CI call targets, completion controls and permission ceilings.
 * Tool configuration and source identities belong to their own consumer tests;
 * changing those inputs does not itself weaken these workflow invariants.
 */
export async function verifyPullRequestPolicyGraph({
  root = REPOSITORY_ROOT_PATH,
} = {}) {
  for (const path of POLICY_WORKFLOW_PATHS) {
    const document = await readWorkflowDocument(join(root, path));
    if (!isDeepStrictEqual(document.permissions, {})) {
      throw new Error(`CI workflow has incorrect default permissions: ${path}`);
    }
    for (const [id, job] of Object.entries(document.jobs)) {
      if (
        job.secrets ||
        job["continue-on-error"] ||
        job.steps?.some((step) => step["continue-on-error"])
      ) {
        throw new Error(`CI consumer weakens completion: ${path}/${id}`);
      }
      if (
        job.uses &&
        !(
          (job.uses.startsWith("./.github/workflows/") &&
            POLICY_WORKFLOW_PATHS.includes(job.uses.slice(2))) ||
          (path === ".github/workflows/markdown-quality.yml" &&
            id === "qualify" &&
            job.uses ===
              "Hadden-Industries/markdown-quality/.github/workflows/markdown-quality.yml@2a8f162cd98a8548d8fa7b065cd6fe1828efcab7")
        )
      ) {
        throw new Error(
          `CI call leaves the permitted workflow graph: ${path}/${id}`,
        );
      }
      if (
        job.uses &&
        ["steps", "timeout-minutes", "runs-on", "defaults"].some((key) =>
          Object.hasOwn(job, key),
        )
      ) {
        throw new Error(`Unsupported reusable caller field: ${path}/${id}`);
      }
      const expectedPermissions =
        path === ".github/workflows/manual-mcp-packages.yml" && id === "draft"
          ? {
              contents: "write",
              actions: "read",
              attestations: "write",
              "id-token": "write",
            }
          : path === ".github/workflows/manual-mcp-packages.yml" &&
              ["validate", "qualify"].includes(id)
            ? { contents: "read", actions: "read" }
            : (path === ".github/workflows/pr-validation.yml" &&
                  id === "gate") ||
                (path === ".github/workflows/full-qualification.yml" &&
                  id === "select")
              ? { contents: "read", actions: "read" }
              : { contents: "read" };
      if (!isDeepStrictEqual(job.permissions, expectedPermissions)) {
        throw new Error(
          `CI job exceeds its permission contract: ${path}/${id}`,
        );
      }
    }
    if (document.on?.workflow_call && document.concurrency) {
      throw new Error(`Reusable consumer owns concurrency: ${path}`);
    }
  }
  return { verifiedWorkflowCount: POLICY_WORKFLOW_PATHS.length };
}
