import { expect, test } from "@jest/globals";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFile,
  readdir,
  lstat,
  realpath,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { OWLManager } from "owlapi/apibinding";
import {
  AddOntologyAnnotation,
  OWLOntologyLoaderConfiguration,
  OWLOntologyWriterConfiguration,
  SetOntologyID,
} from "owlapi/model";
import { StringDocumentSource, StringDocumentTarget } from "owlapi/io";
import { OWLDocumentFormats, RDFXMLDocumentFormat } from "owlapi/formats";
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
// Reuse npm's own selector parser and cache reader through the npm entry point.
const npmRequire = createRequire(process.env.npm_execpath);
const { resolve: parsePackageSpecifier } = npmRequire("npm-package-arg");
const semver = npmRequire("semver");
// The retained verification record describes the exact artifact fetched then.
const artifactSpecifier = "npm:@hadden-industries/owlapi@0.1.0-rc.1";
const integrity =
  "sha512-uDv9Omh2l2zxAjpVeQi4UxXEad/cRiKQUJT5RhxR3WtaAjPL3gAoOha9dPRhH6o2zlBdeg50g8EIVQgtt8RGqA==";
const tarball =
  "https://registry.npmjs.org/@hadden-industries/owlapi/-/owlapi-0.1.0-rc.1.tgz";

function assertIdentity({ manifest, lock, installed }) {
  const specifier = manifest.devDependencies.owlapi;
  assert.equal(typeof specifier, "string");
  const selected = parsePackageSpecifier("owlapi", specifier, root);
  const isExactAlias =
    selected.type === "alias" && selected.subSpec.type === "version";
  const isExactGit =
    selected.type === "git" && /^[a-f0-9]{40}$/u.test(selected.gitCommittish);
  assert.ok(
    isExactAlias || isExactGit,
    "Select an exact npm alias or full Git SHA",
  );
  assert.equal(lock.packages[""].devDependencies.owlapi, specifier);
  const entry = lock.packages["node_modules/owlapi"];
  // npm infers the name from this installation path when it equals "owlapi".
  const packageName = entry.name ?? "owlapi";
  assert.equal(typeof packageName, "string");
  assert.equal(packageName, installed.name);
  assert.equal(entry.version, installed.version);
  assert.ok(semver.valid(entry.version), "Invalid installed package version");
  if (isExactAlias) {
    assert.equal(packageName, selected.subSpec.name);
    assert.equal(entry.version, semver.valid(selected.subSpec.fetchSpec));
    assert.match(entry.resolved, /^https:\/\//u);
  } else {
    const resolved = parsePackageSpecifier("owlapi", entry.resolved, root);
    assert.equal(resolved.type, "git");
    assert.equal(resolved.gitCommittish, selected.gitCommittish);
    // npm canonicalizes hosted Git shorthand in the generated lockfile.
    assert.equal(
      resolved.hosted?.https() ?? resolved.fetchSpec,
      selected.hosted?.https() ?? selected.fetchSpec,
    );
  }
  assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/u);
  assert.ok(!entry.link);
  assert.deepEqual(
    Object.keys(lock.packages).filter((path) =>
      path.endsWith("node_modules/owlapi"),
    ),
    ["node_modules/owlapi"],
  );
}

test("uses the pinned Java-compatible package boundary", () => {
  const manager = OWLManager.createOWLOntologyManager();
  expect(typeof manager.saveOntology).toBe("function");
  expect(manager.getOntologyWriterConfiguration()).toBeInstanceOf(
    OWLOntologyWriterConfiguration,
  );
  expect(typeof manager.setOntologyWriterConfiguration).toBe("function");
  for (const value of [
    AddOntologyAnnotation,
    OWLOntologyLoaderConfiguration,
    SetOntologyID,
    StringDocumentSource,
    StringDocumentTarget,
    OWLOntologyImportsClosureSetProvider,
    OWLOntologyMerger,
    RDFXMLDocumentFormat,
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

function identityFixture(selected, name, version) {
  const metadata = { name, version };
  return {
    manifest: { devDependencies: { owlapi: selected } },
    lock: {
      packages: {
        "": { devDependencies: { owlapi: selected } },
        "node_modules/owlapi": {
          // npm omits the name when it equals the local installation name.
          ...(name === "owlapi" ? { version } : metadata),
          resolved: selected.startsWith("npm:")
            ? "https://registry.npmjs.org/example.tgz"
            : selected,
          integrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
        },
      },
    },
    installed: metadata,
  };
}

test.each([
  [
    `git+https://github.com/example/owlapi.git#${"a".repeat(40)}`,
    "@example/owlapi",
    "1.2.3",
  ],
  ["npm:@example/renamed-owlapi@1.2.3", "@example/renamed-owlapi", "1.2.3"],
  ["npm:owlapi-next@2.0.0-rc.1", "owlapi-next", "2.0.0-rc.1"],
  ["npm:owlapi@1.2.3", "owlapi", "1.2.3"],
  [
    `git+https://github.com/example/owlapi.git#${"b".repeat(40)}`,
    "owlapi",
    "1.2.3",
  ],
])(
  "validates the manifest-selected exact coordinate %s",
  (selected, name, version) => {
    assertIdentity(identityFixture(selected, name, version));
  },
);

test.each([
  "1.2.3",
  "npm:@example/owlapi@^1.2.3",
  "npm:@example/owlapi@>=1.2.3",
  "npm:@example/owlapi@next",
  "npm:@example/owlapi@latest",
  "git+https://github.com/example/owlapi.git#main",
  "git+https://github.com/example/owlapi.git",
  "git+https://github.com/example/owlapi.git#v1.2.3",
  "git+https://github.com/example/owlapi.git#abcdef0",
  "file:../owlapi",
  "link:../owlapi",
])(
  "rejects a nonexact selector even with consistent metadata: %s",
  (selected) => {
    expect(() =>
      assertIdentity(identityFixture(selected, "@example/owlapi", "1.2.3")),
    ).toThrow();
  },
);

test("locks the installed package to the manifest-selected exact source", async () => {
  assertIdentity(await installedIdentity());
  const packageRoot = join(root, "node_modules/owlapi");
  expect((await lstat(packageRoot)).isSymbolicLink()).toBe(false);
  for (const name of allowed) {
    const path = await realpath(fileURLToPath(import.meta.resolve(name)));
    const child = relative(await realpath(packageRoot), path);
    expect(isAbsolute(child) || child.startsWith("..")).toBe(false);
  }
});

test("installed package bytes match the lock-bound cached archive", async () => {
  const identity = await installedIdentity();
  assertIdentity(identity);
  const locked = identity.lock.packages["node_modules/owlapi"];
  const directory = await mkdtemp(join(tmpdir(), "uo-owlapi-payload-"));
  try {
    // npm may skip Git tarball integrity checks. Compare the installed payload
    // with the original cached archive, independently of the installed files.
    const cache = execFileSync(
      process.execPath,
      [process.env.npm_execpath, "config", "get", "cache"],
      { cwd: root, encoding: "utf8", windowsHide: true },
    ).trim();
    const bytes = await npmRequire("cacache").get.byDigest(
      join(cache, "_cacache"),
      locked.integrity,
    );
    assert.equal(
      `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      locked.integrity,
    );
    const archive = join(directory, "owlapi.tgz");
    await writeFile(archive, bytes);
    execFileSync("tar", ["-xzf", archive, "-C", directory], {
      windowsHide: true,
    });
    assert.deepEqual(
      await packageInventory(join(root, "node_modules/owlapi")),
      await packageInventory(join(directory, "package")),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

async function packageInventory(packageRoot) {
  const inventory = await Promise.all(
    (await sources(packageRoot, true)).map(async (path) => [
      relative(packageRoot, path).replaceAll("\\", "/"),
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    ]),
  );
  return inventory.sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

test.each([
  ["installed", "manifest"],
  ["installed", "manifest-and-lock-root"],
  ["npm-alias", "manifest"],
  ["npm-alias", "manifest-and-lock-root"],
  ["npm-zero-version", "manifest-and-lock-root"],
  ["npm-prefixed-zero-version", "manifest-and-lock-root"],
])(
  "rejects a changed exact selection without refreshing the resolved package: %s, %s",
  async (fixture, scope) => {
    const version = fixture.includes("zero-version") ? "0.0.0" : "1.2.3";
    const selectedVersion =
      fixture === "npm-prefixed-zero-version" ? `v${version}` : version;
    const value =
      fixture === "installed"
        ? await installedIdentity()
        : identityFixture(
            `npm:@example/owlapi@${selectedVersion}`,
            "@example/owlapi",
            version,
          );
    assertIdentity(value);
    const specifier = value.manifest.devDependencies.owlapi;
    const selected = parsePackageSpecifier("owlapi", specifier, root);
    const replacement =
      selected.type === "alias"
        ? `npm:${selected.subSpec.name}@${semver.valid(selected.subSpec.fetchSpec) === "0.0.0" ? "0.0.1" : "0.0.0"}`
        : `${specifier.slice(0, specifier.lastIndexOf("#"))}#${selected.gitCommittish === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40)}`;
    assert.notEqual(replacement, specifier);
    value.manifest.devDependencies.owlapi = replacement;
    if (scope === "manifest-and-lock-root")
      value.lock.packages[""].devDependencies.owlapi = replacement;
    expect(() => assertIdentity(value)).toThrow();
  },
);

test.each(["integrity", "resolved", "name", "version", "link"])(
  "rejects altered installed/locked %s",
  async (field) => {
    const value = await installedIdentity();
    value.lock.packages["node_modules/owlapi"][field] =
      field === "link" ? true : "wrong";
    expect(() => assertIdentity(value)).toThrow();
  },
);

function checkImports(source, registry, packageName) {
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
          item.publicSpecifier === value.replace(/^owlapi/u, packageName) &&
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

async function sources(directory, allFiles = false) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    // npm locks nested installed dependencies separately from this payload.
    if (entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (allFiles)
      assert.ok(
        entry.isDirectory() || entry.isFile(),
        `Unsupported package entry: ${path}`,
      );
    if (entry.isDirectory()) result.push(...(await sources(path, allFiles)));
    else if (allFiles || /\.[cm]?js$/u.test(path)) result.push(path);
  }
  return result;
}

test("all consumer imports use complete, public registry bindings", async () => {
  const { name } = await json("node_modules/owlapi/package.json");
  const registry = await json(
    "node_modules/owlapi/docs/compatibility/java-api-surface.json",
  );
  for (const path of [
    ...(await sources(join(root, "scripts"))),
    ...(await sources(join(root, "tests/import-closure"))),
  ]) {
    checkImports(await readFile(path, "utf8"), registry, name);
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
  assert.equal(record.identity.specifier, artifactSpecifier);
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
