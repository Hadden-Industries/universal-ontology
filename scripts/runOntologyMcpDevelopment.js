import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { generateOntologyQueryIndexes } from "./generateOntologyQueryIndexes.js";
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
} = {}) {
  for (const argument of arguments_) {
    if (argument !== "--refresh-index") {
      throw new TypeError(`Unknown local MCP runner argument: ${argument}`);
    }
  }

  const configuration = readLocalOntologyMcpServerConfiguration({
    environment,
    projectRoot,
  });
  if (arguments_.includes("--refresh-index")) {
    await generateOntologyQueryIndexes({
      sourceDirectory: resolve(projectRoot, "src"),
      outputDirectory: configuration.queryRoot,
    });
  }

  // Keep startup, readiness and signal handling in the same process and with
  // the same listener owner used by the workspace's standalone executable.
  return runLocalOntologyMcpServer({
    environment,
    arguments: [],
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
