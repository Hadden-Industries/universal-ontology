import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  NODE_TEST_FAMILIES,
  NODE_FAMILY_TEST_INPUTS,
  nodeFamiliesForPaths,
  suitesForNodeFamilies,
  changedNodeFamilies,
} from "../scripts/pullRequestNodeFamilies.js";
import { nodeCheckArguments } from "../scripts/runPullRequestNodeChecks.js";
import {
  CORE_CHECK_SCOPE_NAMES,
  requiredJobsForScopes,
} from "../scripts/selectPullRequestChecks.js";
const approvedInputs = [
  "packages/universal-ontology-mcp-server/tests/local-universal-ontology-mcp-server.integration.test.js",
  "packages/universal-ontology-mcp-server/tests/mcp-verification-failure.test.js",
  "packages/universal-ontology-mcp-server/tests/ontology-context-transports.integration.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-application-bundle-verifier.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-http-handler.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-operational-events.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-semantic-transports.integration.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-server.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-stdio-configuration.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-stdio-server.integration.test.js",
  "packages/universal-ontology-mcp-server/tests/universal-ontology-mcp-stdio-server.test.js",
  "packages/universal-ontology-projection-policy/tests/ontology-projection-properties.test.js",
  "packages/universal-ontology-query/tests/fetch-ontology-query-artifact-repository.test.js",
  "packages/universal-ontology-query/tests/file-system-ontology-query-artifact-repository.test.js",
  "packages/universal-ontology-query/tests/http-ontology-query-artifact-reader.test.js",
  "packages/universal-ontology-query/tests/json-value-immutability.test.js",
  "packages/universal-ontology-query/tests/node-ontology-query-module.test.js",
  "packages/universal-ontology-query/tests/ontology-context-queries.test.js",
  "packages/universal-ontology-query/tests/ontology-query-artifact-parsing.test.js",
  "packages/universal-ontology-query/tests/ontology-query-channel-manifest-schemas.test.js",
  "packages/universal-ontology-query/tests/ontology-query-module.test.js",
  "packages/universal-ontology-query/tests/ontology-release-query-index.test.js",
  "packages/universal-ontology-query/tests/ontology-store-execution.test.js",
  "packages/universal-ontology-query/tests/persistent-http-ontology-query-artifact-repository.test.js",
  "packages/universal-ontology-query/tests/persistent-ontology-query-artifact-cache.test.js",
  "packages/universal-ontology-query/tests/waiter-aware-shared-operation.test.js",
  "tests/braces-dependency.test.js",
  "tests/build/built-ontology-page.test.js",
  "tests/build/full-ontology-assets.test.js",
  "tests/build/ontology-aliases.test.js",
  "tests/build/ontology-asset-worker-pool.test.js",
  "tests/build/ontology-assets.test.js",
  "tests/build/ontology-context-artifacts.test.js",
  "tests/build/ontology-mcp-development.test.js",
  "tests/build/ontology-mcp-stdio-development.test.js",
  "tests/build/ontology-query-artifacts.test.js",
  "tests/build/ontology-query-package-interfaces.test.js",
  "tests/build/ontology-source-catalog.test.js",
  "tests/build/source-inventory.test.js",
  "tests/build/stage-ontology-query-artifact-channel.test.js",
  "tests/build/vite-plugins.test.js",
  "tests/build/website-build.integration.test.js",
  "tests/distribution/mcp-registry-server-metadata.test.js",
  "tests/distribution/universal-ontology-mcp-container.test.js",
  "tests/distribution/universal-ontology-mcp-distribution-workflow.test.js",
  "tests/distribution/universal-ontology-mcp-npm-package.test.js",
  "tests/distribution/universal-ontology-mcp-platform-archive.test.js",
  "tests/distribution/universal-ontology-mcp-public-artifact-smoke.test.js",
  "tests/distribution/universal-ontology-mcp-spdx-sbom.test.js",
  "tests/distribution/universal-ontology-mcp-workspace-build.test.js",
  "tests/import-closure/atomic-ontology-writer.test.js",
  "tests/import-closure/collapse-imports-closure.test.js",
  "tests/import-closure/contract-policy.test.js",
  "tests/import-closure/create-full-versions.test.js",
  "tests/import-closure/lossless-ontology-load.test.js",
  "tests/import-closure/materialize-import-closure-cli.test.js",
  "tests/import-closure/oasis-xml-catalog-iri-mapper.test.js",
  "tests/import-closure/ontology-document-loader.test.js",
  "tests/import-closure/ontology-structural-fingerprint.test.js",
  "tests/import-closure/owlapi-package-boundary.test.js",
  "tests/import-closure/qualification-identity.test.js",
  "tests/import-closure/real-distribution-contract.test.js",
  "tests/import-closure/structural-taxonomy.test.js",
  "tests/import-closure/verify-standalone-ontology.test.js",
  "tests/json-ld-to-csv.test.js",
  "tests/mcp/github-mcp-server-launcher.test.js",
  "tests/ontology-csv.test.js",
  "tests/ontology-view-model.test.js",
  "tests/owl-to-uml-xmi-converter.test.js",
  "tests/rdf-xml-to-json-ld.test.js",
  "tests/webmcp/displayed-ontology-entity-definition-tool.test.js",
  "tests/webmcp/displayed-ontology-release-context.test.js",
  "tests/webmcp/ontology-entity-definition-resolver.test.js",
  "tests/webmcp/ontology-entity-definition-result-schemas.test.js",
];
test("closed family union equals accepted independent native test inventory", () => {
  expect([...NODE_FAMILY_TEST_INPUTS].sort()).toEqual(approvedInputs);
  expect(new Set(NODE_FAMILY_TEST_INPUTS).size).toBe(74);
});
test.each([
  "build",
  "import_closure",
  "query",
  "frontend",
  "mcp",
  "distribution",
  "utilities",
])("family %s owns every declared test", (family) => {
  expect(nodeFamiliesForPaths(NODE_TEST_FAMILIES[family])).toEqual([family]);
  expect(suitesForNodeFamilies([family])).toEqual(
    [...NODE_TEST_FAMILIES[family]].sort(),
  );
});
test.each(
  [
    [],
    ["src/main.js"],
    ["tests/new.test.js"],
    ["tests/build/source-inventory.test.js/foreign"],
    ["tests/build/source-inventory.test.js", "src/main.js"],
  ].map((paths) => ({ paths })),
)("unknown or mixed inputs $paths remain broad", ({ paths }) =>
  expect(nodeFamiliesForPaths(paths)).toBeNull(),
);
test("mixed known native tests retain the complete family union", () => {
  expect(
    nodeFamiliesForPaths([
      NODE_TEST_FAMILIES.query[0],
      NODE_TEST_FAMILIES.build[0],
    ]),
  ).toEqual(["build", "query"]);
  expect(suitesForNodeFamilies(["build", "query"])).toHaveLength(30);
});
test("native arguments select real closed inventories", () => {
  const scopes = Object.fromEntries(
    CORE_CHECK_SCOPE_NAMES.map((name) => [name, name === "product_tests"]),
  );
  const plan = {
    schemaVersion: 5,
    mode: "changed",
    packageMode: "disabled",
    revision: "a".repeat(40),
    comparisonBase: "b".repeat(40),
    scopes,
    requiredJobs: requiredJobsForScopes(scopes),
  };
  expect(nodeCheckArguments(plan, { families: ["query"] })).toEqual([
    "--runTestsByPath",
    ...suitesForNodeFamilies(["query"]),
  ]);
  expect(() => nodeCheckArguments(plan, { families: ["unknown"] })).toThrow();
  expect(() => suitesForNodeFamilies(["query", "query"])).toThrow();
  expect(
    nodeCheckArguments(
      { ...plan, packageMode: "ci" },
      { families: ["query"] },
    )[0],
  ).toContain("testPathIgnorePatterns");
  const mixed = structuredClone(plan);
  mixed.scopes.website_build = true;
  mixed.requiredJobs = requiredJobsForScopes(mixed.scopes);
  expect(nodeCheckArguments(mixed, { families: ["query"] })[0]).toContain(
    "testPathIgnorePatterns",
  );
});
test("actual Git type records reject deletion and empty inputs", () => {
  const root = mkdtempSync(join(tmpdir(), "uo-family-inputs-"));
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(root, "empty-global-config"),
  };
  writeFileSync(env.GIT_CONFIG_GLOBAL, "");
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      env,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  const path = NODE_TEST_FAMILIES.query[0];
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "first");
  git(["init", "--initial-branch=main"]);
  git(["add", "--", path]);
  git([
    "-c",
    "user.name=Native family fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Baseline",
  ]);
  const base = git(["rev-parse", "HEAD"]);
  try {
    expect(changedNodeFamilies({ root, base, revision: base })).toBeNull();
    writeFileSync(file, "changed");
    git(["add", "--", path]);
    git([
      "-c",
      "user.name=Native family fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "Changed",
    ]);
    const changed = git(["rev-parse", "HEAD"]);
    expect(changedNodeFamilies({ root, base, revision: changed })).toEqual([
      "query",
    ]);
    rmSync(file);
    git(["add", "--", path]);
    git([
      "-c",
      "user.name=Native family fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "Removed",
    ]);
    expect(
      changedNodeFamilies({
        root,
        base: changed,
        revision: git(["rev-parse", "HEAD"]),
      }),
    ).toBeNull();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
