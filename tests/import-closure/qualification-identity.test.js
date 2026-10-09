import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  collectHistoricalRcQualificationIdentity,
  findOwlapiPackageRoot,
} from "../../scripts/ontology/qualificationIdentity.js";
const directories = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});
test("locates the installed scoped package through its public model entry", async () => {
  expect(await findOwlapiPackageRoot()).toMatch(/owlapi$/u);
});
test.each(["tarball", "lockfile", "upstream"])(
  "rejects inconsistent historical rc.1 %s identity",
  async (fault) => {
    const root = await mkdtemp(join(tmpdir(), "uo-identity-test-"));
    directories.push(root);
    const packageRoot = join(root, "package");
    await mkdir(join(packageRoot, "docs/compatibility"), { recursive: true });
    const metadata = {
      name: "@hadden-industries/owlapi",
      version: "0.1.0-rc.1",
    };
    const bytes = Buffer.from("retained candidate");
    await writeFile(join(root, "candidate.tgz"), bytes);
    await writeFile(
      join(root, "candidate-manifest.json"),
      JSON.stringify({
        package: metadata,
        tarball: {
          fileName: "candidate.tgz",
          sha256:
            fault === "tarball"
              ? "wrong"
              : createHash("sha256").update(bytes).digest("hex"),
        },
      }),
    );
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify(metadata),
    );
    await writeFile(
      join(packageRoot, "docs/compatibility/java-api-surface.json"),
      "{}",
    );
    await writeFile(
      join(root, "package-lock.json"),
      JSON.stringify({
        packages: {
          "node_modules/owlapi": {
            ...metadata,
            integrity:
              fault === "lockfile"
                ? "wrong"
                : `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
          },
        },
      }),
    );
    await writeFile(join(root, "upstream.json"), "{}");
    await expect(
      collectHistoricalRcQualificationIdentity({
        sourceRoot: root,
        candidateDirectory: root,
        consumerRoot: root,
        packageRoot,
        upstreamEvidencePath: join(root, "upstream.json"),
      }),
    ).rejects.toThrow(
      {
        tarball: "Candidate tarball digest mismatch",
        lockfile: "Installed/locked candidate identity mismatch",
        upstream: "Missing upstream source identity",
      }[fault],
    );
  },
);
