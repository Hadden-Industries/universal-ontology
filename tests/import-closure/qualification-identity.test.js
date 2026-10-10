import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, mkdir, writeFile, rm, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
test.each(["matching", "unscoped", "name", "version"])(
  "locates the lock-selected npm alias and rejects changed metadata: %s",
  async (fault) => {
    const root = await mkdtemp(join(tmpdir(), "uo-alias-identity-"));
    directories.push(root);
    const source = join(root, "scripts/ontology/qualificationIdentity.js");
    const packageRoot = join(root, "node_modules/owlapi");
    await mkdir(join(root, "scripts/ontology"), { recursive: true });
    await mkdir(join(packageRoot, "model"), { recursive: true });
    await copyFile(
      new URL(
        "../../scripts/ontology/qualificationIdentity.js",
        import.meta.url,
      ),
      source,
    );
    const metadata = {
      name: fault === "unscoped" ? "owlapi" : "@example/renamed-owlapi",
      version: "1.2.3",
    };
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await writeFile(
      join(root, "package-lock.json"),
      JSON.stringify({
        packages: {
          "node_modules/owlapi":
            fault === "unscoped" ? { version: metadata.version } : metadata,
        },
      }),
    );
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({
        ...metadata,
        ...(["matching", "unscoped"].includes(fault)
          ? {}
          : { [fault]: "wrong" }),
        type: "module",
        exports: { "./model": "./model/index.js" },
      }),
    );
    await writeFile(join(packageRoot, "model/index.js"), "export {};\n");
    const locate = () =>
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          `import { findOwlapiPackageRoot } from ${JSON.stringify(pathToFileURL(source).href)}; console.log(await findOwlapiPackageRoot());`,
        ],
        { encoding: "utf8", windowsHide: true, stdio: "pipe", timeout: 10000 },
      );
    if (["matching", "unscoped"].includes(fault))
      expect(locate().trim()).toBe(packageRoot);
    else expect(locate).toThrow(/Unexpected owlapi package identity/u);
  },
);

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
