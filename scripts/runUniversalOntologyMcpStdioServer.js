#!/usr/bin/env node

import process from "node:process";

import { runUniversalOntologyMcpStdioServer } from "../src/mcp/runUniversalOntologyMcpStdioServer.js";

try {
  await runUniversalOntologyMcpStdioServer();
} catch (error) {
  // The source runner emits the fixed redacted startup event before rejecting.
  // This executable boundary owns only the final process status and must never
  // echo an arbitrary exception onto stderr or the protocol stdout stream.
  process.exitCode = 1;
  void error;
}
