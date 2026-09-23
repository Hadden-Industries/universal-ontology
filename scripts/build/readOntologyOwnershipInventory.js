import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

/** Reuse the policy owner's module registry through the existing repository venv. */
export async function readOntologyOwnershipInventory(repositoryRoot) {
  const policy = await readFile(
    join(repositoryRoot, "policy", "activation.ttl"),
  );
  const owner = await readFile(
    join(repositoryRoot, "scripts", "ontology_policy", "modules.py"),
  );
  const python = join(
    repositoryRoot,
    ".venv",
    ...(process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"]),
  );
  const script =
    "import json; from scripts.ontology_policy.modules import load_owned_modules; print(json.dumps([{'ontologyIri': str(m.ontology_iri), 'ownedNamespaces': list(m.owned_namespaces), 'workingPath': m.working_path, 'activeArtifactPath': m.active_artifact_path, 'activeContentDigest': m.active_content_digest} for m in load_owned_modules()]))";
  const { stdout } = await promisify(execFile)(
    python,
    ["-B", "-X", "utf8", "-c", script],
    {
      cwd: repositoryRoot,
      windowsHide: true,
      timeout: 30000,
      maxBuffer: 65536,
    },
  );
  const sha256 = createHash("sha256")
    .update(policy)
    .update(owner)
    .digest("hex");
  return {
    sha256,
    modules: JSON.parse(stdout),
    async assertUnchanged() {
      const currentPolicy = await readFile(
        join(repositoryRoot, "policy", "activation.ttl"),
      );
      const currentOwner = await readFile(
        join(repositoryRoot, "scripts", "ontology_policy", "modules.py"),
      );
      if (
        createHash("sha256")
          .update(currentPolicy)
          .update(currentOwner)
          .digest("hex") !== sha256
      )
        throw new Error("Ownership policy changed during generation.");
    },
  };
}
