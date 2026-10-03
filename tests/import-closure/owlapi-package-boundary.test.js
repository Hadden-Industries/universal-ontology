import { expect, test } from "@jest/globals";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, realpath } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { OWLManager } from "owlapi/apibinding";
import {
  AddOntologyAnnotation,
  OWLOntologyLoaderConfiguration,
  SetOntologyID,
} from "owlapi/model";
import { StringDocumentSource, StringDocumentTarget } from "owlapi/io";
import { OWLDocumentFormats } from "owlapi/formats";
import {
  OWLOntologyImportsClosureSetProvider,
  OWLOntologyMerger,
} from "owlapi/util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const json = async (path) =>
  JSON.parse(await readFile(join(root, path), "utf8"));
const allowed = ["apibinding", "model", "io", "formats", "util"].map(
  (name) => `owlapi/${name}`,
);
const specifier = "npm:@hadden-industries/owlapi@0.1.0-rc.1";
const integrity =
  "sha512-uDv9Omh2l2zxAjpVeQi4UxXEad/cRiKQUJT5RhxR3WtaAjPL3gAoOha9dPRhH6o2zlBdeg50g8EIVQgtt8RGqA==";
const tarball =
  "https://registry.npmjs.org/@hadden-industries/owlapi/-/owlapi-0.1.0-rc.1.tgz";

function assertIdentity({ manifest, lock, installed }) {
  assert.equal(manifest.devDependencies.owlapi, specifier);
  assert.equal(lock.packages[""].devDependencies.owlapi, specifier);
  const entry = lock.packages["node_modules/owlapi"];
  for (const metadata of [entry, installed]) {
    assert.equal(metadata.name, "@hadden-industries/owlapi");
    assert.equal(metadata.version, "0.1.0-rc.1");
  }
  assert.equal(entry.resolved, tarball);
  assert.equal(entry.integrity, integrity);
  assert.ok(!entry.link);
}

test("uses the released Java-compatible package boundary", () => {
  const manager = OWLManager.createOWLOntologyManager();
  expect(typeof manager.saveOntology).toBe("function");
  for (const value of [
    AddOntologyAnnotation,
    OWLOntologyLoaderConfiguration,
    SetOntologyID,
    StringDocumentSource,
    StringDocumentTarget,
    OWLOntologyImportsClosureSetProvider,
    OWLOntologyMerger,
  ])
    expect(typeof value).toBe("function");
  expect(OWLDocumentFormats.RDF_XML).toBeDefined();
  expect(OWLDocumentFormats.FUNCTIONAL).toBeDefined();
});

async function installedIdentity() {
  return {
    manifest: await json("package.json"),
    lock: await json("package-lock.json"),
    installed: await json("node_modules/owlapi/package.json"),
  };
}

test("pins the native alias to the independently verified public artifact", async () => {
  assertIdentity(await installedIdentity());
  const packageRoot = join(root, "node_modules/owlapi");
  expect((await lstat(packageRoot)).isSymbolicLink()).toBe(false);
  for (const name of allowed) {
    const path = await realpath(fileURLToPath(import.meta.resolve(name)));
    const child = relative(await realpath(packageRoot), path);
    expect(isAbsolute(child) || child.startsWith("..")).toBe(false);
  }
  const bytes = await readFile(
    join(packageRoot, "docs/compatibility/java-api-surface.json"),
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "cf367d97cea09eb9fe99b6f0e68f8ddb8ded8555259a4cc956b16bb19218ba6a",
  );
});

test.each([
  "0.1.0-rc.1",
  "npm:@other/owlapi@0.1.0-rc.1",
  "npm:@hadden-industries/owlapi@0.1.0-rc.2",
  "npm:@hadden-industries/owlapi@next",
  "npm:@hadden-industries/owlapi@latest",
  "npm:@hadden-industries/owlapi@^0.1.0",
  "file:../owlapi",
  "link:../owlapi",
])("rejects dependency substitution %s", async (replacement) => {
  const value = await installedIdentity();
  value.manifest.devDependencies.owlapi = replacement;
  value.lock.packages[""].devDependencies.owlapi = replacement;
  expect(() => assertIdentity(value)).toThrow();
});

test.each(["integrity", "resolved", "name", "version", "link"])(
  "rejects altered installed/locked %s",
  async (field) => {
    const value = await installedIdentity();
    value.lock.packages["node_modules/owlapi"][field] =
      field === "link" ? true : "wrong";
    expect(() => assertIdentity(value)).toThrow();
  },
);

function checkImports(source, registry) {
  const check = (node, specifierNode, bindings = []) => {
    const value = specifierNode?.value;
    if (typeof value !== "string" || !/owlapi/iu.test(value)) return;
    assert.ok(allowed.includes(value), `Forbidden owlapi import: ${value}`);
    for (const binding of bindings) {
      assert.equal(
        binding.type,
        "ImportSpecifier",
        "Use named public bindings",
      );
      const entry = registry.bindings.find(
        (item) =>
          item.publicSpecifier ===
            value.replace(/^owlapi/u, "@hadden-industries/owlapi") &&
          item.jsExport === binding.imported.name,
      );
      assert.ok(entry, `Unregistered binding ${binding.imported.name}`);
      assert.equal(entry.exposure, "PUBLIC");
      assert.equal(entry.progress, "COMPLETE");
    }
  };
  const linter = new Linter();
  const messages = linter.verify(source, [
    {
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: false,
      },
      plugins: {
        boundary: {
          rules: {
            imports: {
              create: () => ({
                ImportDeclaration: (node) =>
                  check(node, node.source, node.specifiers),
                ExportNamedDeclaration: (node) => check(node, node.source),
                ExportAllDeclaration: (node) => check(node, node.source),
                ImportExpression: (node) => check(node, node.source),
                CallExpression: (node) => {
                  if (
                    node.callee.name === "require" ||
                    node.callee.property?.name === "resolve"
                  )
                    check(node, node.arguments[0]);
                },
              }),
            },
          },
        },
      },
      rules: { "boundary/imports": "error" },
    },
  ]);
  assert.equal(
    messages.filter((message) => message.severity === 2).length,
    0,
    JSON.stringify(messages),
  );
}

async function sources(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sources(path)));
    else if (/\.[cm]?js$/u.test(path)) result.push(path);
  }
  return result;
}

test("all consumer imports use complete, public registry bindings", async () => {
  const registry = await json(
    "node_modules/owlapi/docs/compatibility/java-api-surface.json",
  );
  for (const path of [
    ...(await sources(join(root, "scripts"))),
    ...(await sources(join(root, "tests/import-closure"))),
  ]) {
    checkImports(await readFile(path, "utf8"), registry);
  }
});

test.each([
  "owlapi",
  "owlapi/internal/parser",
  "owlapi/rdf",
  "owlapi/unknown",
  "../../owlapi/model/index.js",
])("rejects forbidden import %s", (name) => {
  expect(() =>
    checkImports(`import { X } from ${JSON.stringify(name)};`, {
      bindings: [],
    }),
  ).toThrow();
});

// This is an immutable observation from the live verifier, not a claim that
// offline unit tests perform cryptographic registry verification themselves.
function assertProvenance(record) {
  assert.equal(record.status, "PASS");
  assert.equal(record.stage, "PUBLIC_REGISTRY_ARTIFACT_VERIFICATION");
  assert.equal(
    record.consumerAcceptance,
    "NOT_ASSESSED_BY_THIS_ARTIFACT_RECORD",
  );
  assert.equal(record.identity.mode, "PUBLIC_REGISTRY");
  assert.equal(record.identity.dependencyName, "owlapi");
  assert.deepEqual(record.identity.importSpecifiers, [
    "owlapi",
    "owlapi/apibinding",
    "owlapi/model",
    "owlapi/io",
    "owlapi/formats",
    "owlapi/profiles",
    "owlapi/util",
  ]);
  assert.deepEqual(
    record.tests,
    ["smoke", "boundary", "import-purity", "no-network", "import-closure"].map(
      (name) => ({ script: `installed-package-${name}.mjs`, status: "PASS" }),
    ),
  );
  assert.equal(record.identity.integrity, integrity);
  assert.equal(record.identity.resolved, tarball);
  assert.deepEqual(record.identity.package, {
    name: "@hadden-industries/owlapi",
    version: "0.1.0-rc.1",
  });
  assert.equal(record.identity.specifier, specifier);
  assert.equal(
    record.apiRegistrySha256,
    "cf367d97cea09eb9fe99b6f0e68f8ddb8ded8555259a4cc956b16bb19218ba6a",
  );
  assert.equal(
    record.tarballSha256,
    "4e18d8a1d2f41af0f31f0426a24d57ddfa25316fba6be550adf2edd6202cabf8",
  );
  assert.equal(record.provenance.subjectSha256, record.tarballSha256);
  assert.equal(
    record.provenance.sourceCommit,
    "59131be0c1dc3a634e8433b06d2949051c051c0a",
  );
  assert.equal(record.provenance.runId, "37072579336");
  assert.equal(record.provenance.runAttempt, 1);
  assert.equal(record.provenance.sourceRef, "refs/heads/main");
  assert.equal(record.provenance.workflow, ".github/workflows/release.yml");
  assert.deepEqual(record.signatures, { invalid: [], missing: [] });
  assert.deepEqual(record.releaseTagVerification, {
    tag: "v0.1.0-rc.1",
    tagObject: "8b944e532430ebd3a10b834309b54fb0428f7eed",
    sourceCommit: record.provenance.sourceCommit,
    localSignature: "PASS",
    fingerprint: "SHA256:0lELaqBbgGHdSctv4GOpPmROX56wNCaii2PLZI5pXCU",
    githubVerified: true,
    githubReason: "valid",
  });
}

test.each(["mode", "dependencyName", "importSpecifiers"])(
  "rejects altered artifact identity field %s",
  async (field) => {
    const value = await json(
      "docs/import-closure/registry-artifact-verification.json",
    );
    value.identity[field] = "wrong";
    expect(() => assertProvenance(value)).toThrow();
  },
);

test.each(["missing", "failed", "acceptance-marker"])(
  "rejects incomplete artifact evidence: %s",
  async (fault) => {
    const value = await json(
      "docs/import-closure/registry-artifact-verification.json",
    );
    if (fault === "missing") value.tests = [];
    else if (fault === "failed") value.tests[0].status = "FAIL";
    else value.consumerAcceptance = "PASS";
    expect(() => assertProvenance(value)).toThrow();
  },
);

test("rejects lockfile-only alias substitution", async () => {
  const value = await installedIdentity();
  value.lock.packages[""].devDependencies.owlapi =
    "npm:@hadden-industries/owlapi@next";
  expect(() => assertIdentity(value)).toThrow();
});

test.each(["apiRegistrySha256", "releaseTagVerification", "identity"])(
  "rejects altered registry record %s",
  async (field) => {
    const value = await json(
      "docs/import-closure/registry-artifact-verification.json",
    );
    value[field] = "wrong";
    expect(() => assertProvenance(value)).toThrow();
  },
);

test("retains the verified publication identity separately from consumer acceptance", async () => {
  assertProvenance(
    await json("docs/import-closure/registry-artifact-verification.json"),
  );
});

test.each([
  "sourceCommit",
  "sourceRef",
  "workflow",
  "subjectSha256",
  "runId",
  "runAttempt",
])("rejects mismatched provenance %s", async (field) => {
  const record = await json(
    "docs/import-closure/registry-artifact-verification.json",
  );
  record.provenance[field] = "wrong";
  expect(() => assertProvenance(record)).toThrow();
});
