/** Closed test-file ownership from the accepted native inventory.
 * Source, fixtures, configuration, new suites and mixed changes retain broad work.
 */
import { spawnSync } from "node:child_process";
export const NODE_TEST_FAMILIES = Object.freeze({
  build: Object.freeze([
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
  ]),
  import_closure: Object.freeze([
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
  ]),
  query: Object.freeze([
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
  ]),
  frontend: Object.freeze([
    "tests/webmcp/displayed-ontology-entity-definition-tool.test.js",
    "tests/webmcp/displayed-ontology-release-context.test.js",
    "tests/webmcp/ontology-entity-definition-resolver.test.js",
    "tests/webmcp/ontology-entity-definition-result-schemas.test.js",
  ]),
  mcp: Object.freeze([
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
  ]),
  distribution: Object.freeze([
    "tests/distribution/mcp-registry-server-metadata.test.js",
    "tests/distribution/universal-ontology-mcp-container.test.js",
    "tests/distribution/universal-ontology-mcp-distribution-workflow.test.js",
    "tests/distribution/universal-ontology-mcp-npm-package.test.js",
    "tests/distribution/universal-ontology-mcp-platform-archive.test.js",
    "tests/distribution/universal-ontology-mcp-public-artifact-smoke.test.js",
    "tests/distribution/universal-ontology-mcp-spdx-sbom.test.js",
    "tests/distribution/universal-ontology-mcp-workspace-build.test.js",
  ]),
  utilities: Object.freeze([
    "tests/braces-dependency.test.js",
    "tests/json-ld-to-csv.test.js",
    "tests/ontology-csv.test.js",
    "tests/ontology-view-model.test.js",
    "tests/owl-to-uml-xmi-converter.test.js",
    "tests/rdf-xml-to-json-ld.test.js",
    "tests/mcp/github-mcp-server-launcher.test.js",
  ]),
});
export const NODE_FAMILY_TEST_INPUTS = Object.freeze(
  Object.values(NODE_TEST_FAMILIES).flat(),
);
export function nodeFamiliesForPaths(paths) {
  if (
    !Array.isArray(paths) ||
    !paths.length ||
    paths.some((path) => !NODE_FAMILY_TEST_INPUTS.includes(path))
  )
    return null;
  return Object.keys(NODE_TEST_FAMILIES).filter((family) =>
    NODE_TEST_FAMILIES[family].some((path) => paths.includes(path)),
  );
}
export function suitesForNodeFamilies(families) {
  if (
    !Array.isArray(families) ||
    !families.length ||
    new Set(families).size !== families.length ||
    families.some((family) => !Object.hasOwn(NODE_TEST_FAMILIES, family))
  )
    throw Error("Invalid native family inventory.");
  return [
    ...new Set(families.flatMap((family) => NODE_TEST_FAMILIES[family])),
  ].sort();
}
/** Native status records keep deletions, renames and type changes conservative. */
export function changedNodeFamilies({ root, base, revision }) {
  if (
    !/^[a-f0-9]{40}$/.test(base ?? "") ||
    !/^[a-f0-9]{40}$/.test(revision ?? "")
  )
    throw Error("Exact family comparison is unavailable.");
  const result = spawnSync(
    "git",
    [
      "diff",
      "--name-status",
      "-z",
      "--no-renames",
      "--no-ext-diff",
      "--no-textconv",
      base,
      revision,
      "--",
    ],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0)
    throw Error("Native family input comparison failed.");
  const records = result.stdout.split("\0");
  if (records.pop() !== "") throw Error("Incomplete native status records.");
  if (records.length % 2 !== 0) throw Error("Invalid native status records.");
  const paths = [];
  for (let index = 0; index < records.length; index += 2) {
    if (!["A", "M"].includes(records[index])) return null;
    paths.push(records[index + 1]);
  }
  return nodeFamiliesForPaths(paths);
}
