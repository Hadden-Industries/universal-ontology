import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const ubuntuLabel = /^ubuntu-(\d[02468])\.04$/u;

export function runnerPolicy(root = repositoryRoot) {
  const policy = JSON.parse(
    readFileSync(join(root, ".github/runner-policy.json"), "utf8"),
  );
  const release =
    typeof policy?.ubuntu === "string" &&
    ubuntuLabel.exec(`ubuntu-${policy.ubuntu}`);
  if (!release || Object.keys(policy).length !== 1)
    throw new Error(
      "Expected one Ubuntu LTS release in .github/runner-policy.json.",
    );
  return {
    release: policy.ubuntu,
    runner: release[0],
    armRunner: `${release[0]}-arm`,
    image: `ubuntu${release[1]}`,
  };
}

export const ubuntu = Object.freeze(runnerPolicy());
