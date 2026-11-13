import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { generateOntologyQueryIndexes } from "./generateOntologyQueryIndexes.js";
import { readOntologySourceCatalog } from "./build/readOntologySourceCatalog.js";
import { readOntologyOwnershipInventory } from "./build/readOntologyOwnershipInventory.js";
import {
  readLocalOntologyMcpServerConfiguration,
  runLocalOntologyMcpServer,
  writeLocalOntologyMcpProcessFailureEvent,
} from "../packages/universal-ontology-mcp-server/scripts/runLocalOntologyMcpServer.js";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../", import.meta.url));

/** Compose repository index generation with the workspace's listener lifecycle. */
export async function runOntologyMcpDevelopment({
  environment = process.env,
  arguments: arguments_ = process.argv.slice(2),
  projectRoot = REPOSITORY_ROOT_PATH,
  readGenerationContext = async (repositoryRoot) => ({
    sourceCatalog: await readOntologySourceCatalog({
      repositoryRoot,
      catalogPath: resolve(repositoryRoot, "core/catalog-v001.xml"),
    }),
    ownershipInventory: await readOntologyOwnershipInventory(repositoryRoot),
  }),
} = {}) {
  for (const argument of arguments_) {
    if (
      argument !== "--refresh-index" &&
      !/^--ontology-(?:file|root|mode|imports|import-policy|format)=/u.test(
        argument,
      )
    ) {
      throw new TypeError(`Unknown local MCP runner argument: ${argument}`);
    }
  }

  const configuration = readLocalOntologyMcpServerConfiguration({
    environment,
    projectRoot,
  });
  const sourceArguments = arguments_.filter(
    (argument) => argument !== "--refresh-index",
  );
  if (arguments_.includes("--refresh-index")) {
    if (
      sourceArguments.length ||
      ["FILE", "ROOT", "MODE", "FORMAT", "IMPORTS", "IMPORT_POLICY"].some(
        (key) => Boolean(environment["UNIVERSAL_ONTOLOGY_MCP_ONTOLOGY_" + key]),
      )
    )
      throw new TypeError(
        "Cannot combine artifact refresh with direct ontology options.",
      );
    await generateOntologyQueryIndexes({
      ...(await readGenerationContext(projectRoot)),
      repositoryRoot: projectRoot,
      sourceDirectory: resolve(projectRoot, "src"),
      outputDirectory: configuration.queryRoot,
    });
  }

  // Keep startup, readiness and signal handling in the same process and with
  // the same listener owner used by the workspace's standalone executable.
  return runLocalOntologyMcpServer({
    environment,
    arguments:
      sourceArguments.length ||
      arguments_.includes("--refresh-index") ||
      environment.UNIVERSAL_ONTOLOGY_QUERY_ROOT ||
      environment.UNIVERSAL_ONTOLOGY_MCP_ONTOLOGY_FILE ||
      environment.UNIVERSAL_ONTOLOGY_MCP_ONTOLOGY_ROOT
        ? sourceArguments
        : [
            "--ontology-file=" +
              resolve(projectRoot, "src/universal/core/20260912"),
          ],
    configuration,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runOntologyMcpDevelopment().catch((error) => {
    writeLocalOntologyMcpProcessFailureEvent(
      "mcp_server_startup_failed",
      "SERVER_STARTUP_FAILED",
    );
    process.exitCode = 1;
    void error;
  });
}
