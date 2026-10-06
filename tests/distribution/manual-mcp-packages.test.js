import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";
import {
  verifyManualMcpCandidate,
  createManualMcpDraft,
} from "../../scripts/distribution/prepareManualMcpRelease.js";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
test("qualified manual candidate preserves exact files and rejects byte tampering", async () => {
  const directory = mkdtempSync(join(tmpdir(), "uo-manual-candidate-"));
  const fileNames = ["server.json", "universal-ontology-mcp-server-1.0.0.tgz"];
  const body = fileNames.map((name) => `${sha256(name)}  ${name}\n`).join("");
  const identity = {
    directory,
    fileNames,
    revision: "a".repeat(40),
    version: "1.0.0",
    candidateSha256: sha256(body),
    artifactId: "42",
    artifactDigest: "b".repeat(64),
    archiveDigest: "b".repeat(64),
    runId: "9",
    metadata: {
      id: 42,
      name: `universal-ontology-mcp-server-development-candidate-${sha256(body)}`,
      digest: `sha256:${"b".repeat(64)}`,
      expired: false,
      workflow_run: { id: 9, head_sha: "a".repeat(40), head_branch: "main" },
    },
  };
  try {
    for (const name of fileNames) writeFileSync(join(directory, name), name);
    writeFileSync(join(directory, "SHA256SUMS"), body);
    await expect(verifyManualMcpCandidate(identity)).resolves.toEqual(
      [...fileNames, "SHA256SUMS"].sort(),
    );
    for (const change of [
      { archiveDigest: "c".repeat(64) },
      { artifactId: "43" },
      { candidateSha256: "c".repeat(64) },
      { revision: "c".repeat(40) },
      { runId: "10" },
      { version: "1.0.0; publish" },
      { metadata: { ...identity.metadata, expired: true } },
      {
        metadata: {
          ...identity.metadata,
          workflow_run: {
            ...identity.metadata.workflow_run,
            head_branch: "feature",
          },
        },
      },
    ])
      await expect(
        verifyManualMcpCandidate({ ...identity, ...change }),
      ).rejects.toThrow();
    writeFileSync(join(directory, "extra.sh"), "do not execute");
    await expect(verifyManualMcpCandidate(identity)).rejects.toThrow(
      /inventory/u,
    );
    rmSync(join(directory, "extra.sh"));
    writeFileSync(join(directory, fileNames[0]), "tampered");
    await expect(verifyManualMcpCandidate(identity)).rejects.toThrow(
      /checksum/u,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("draft creation passes verified files to native gh and never publishes publicly", () => {
  const calls = [];
  const target = {
    repository: "Hadden-Industries/universal-ontology",
    revision: "a".repeat(40),
    version: "1.0.0",
    directory: "dist/manual-candidate",
    files: ["SHA256SUMS", "server.json"],
  };
  createManualMcpDraft(
    target,
    (path) => (path.includes("releases?") ? [] : null),
    (command, args) => {
      calls.push({ command, args });
      return { status: 0 };
    },
  );
  expect(calls).toHaveLength(1);
  expect(calls[0].command).toBe("gh");
  expect(calls[0].args.slice(0, 9)).toEqual([
    "release",
    "create",
    "universal-ontology-mcp-server-v1.0.0",
    "--repo",
    target.repository,
    "--draft",
    "--target",
    target.revision,
    "--title",
  ]);
  expect(calls[0].args.slice(-2)).toEqual(
    target.files.map((name) => join(target.directory, name)),
  );
  expect(() =>
    createManualMcpDraft(
      target,
      () => ({ existing: true }),
      () => {
        throw new Error("must not write");
      },
    ),
  ).toThrow(/already exists/u);
  expect(() =>
    createManualMcpDraft(
      target,
      () => {
        throw new Error("API unavailable");
      },
      () => {
        throw new Error("must not write");
      },
    ),
  ).toThrow("API unavailable");
});

test("only explicit main dispatch can reach the isolated draft publisher", () => {
  const workflow = parse(
    readFileSync(
      new URL(
        "../../.github/workflows/manual-mcp-packages.yml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
  expect(
    workflow.on.workflow_dispatch.inputs.create_draft_release,
  ).toMatchObject({ type: "boolean", default: false });
  expect(workflow.jobs.qualify.with).toEqual({ include_mcp_packages: true });
  expect(workflow.jobs.qualify.if).toBe("github.ref == 'refs/heads/main'");
  expect(workflow.jobs.draft.if).toContain("inputs.create_draft_release");
  expect(workflow.jobs.draft.if).toContain(
    "needs.validate.result == 'success'",
  );
  for (const [id, job] of Object.entries(workflow.jobs)) {
    expect(job.permissions.contents).toBe(id === "draft" ? "write" : "read");
    expect(
      job.steps?.some(({ run }) => run && /npm|build:mcp|pack:mcp/u.test(run)),
    ).not.toBe(true);
  }
  expect(
    workflow.jobs.draft.steps.find((step) =>
      step.uses?.startsWith("actions/attest@"),
    ),
  ).toBeDefined();
  expect(workflow.jobs.draft.steps.at(-1).run).toBe(
    "node scripts/distribution/prepareManualMcpRelease.js --draft",
  );
});

test("unpublished drafts on later API pages prevent publication", () => {
  const target = {
    repository: "Hadden-Industries/universal-ontology",
    revision: "a".repeat(40),
    version: "1.0.0",
    directory: "dist/manual-candidate",
    files: ["SHA256SUMS"],
  };
  const visited = [];
  const request = (path) => {
    visited.push(path);
    if (path.includes("git/ref")) return null;
    if (path.endsWith("page=1"))
      return Array.from({ length: 100 }, (_, index) => ({
        tag_name: `old-${index}`,
        draft: false,
      }));
    return [{ tag_name: "universal-ontology-mcp-server-v1.0.0", draft: true }];
  };
  expect(() =>
    createManualMcpDraft(target, request, () => {
      throw new Error("must not publish");
    }),
  ).toThrow(/already exists/u);
  expect(visited.at(-1)).toContain("page=2");
});
