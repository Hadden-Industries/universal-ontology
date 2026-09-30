import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SdkError, SdkErrorCode } from "@modelcontextprotocol/client";
import { formatMcpVerificationFailure } from "../scripts/formatMcpVerificationFailure.js";

const PRIVATE_TEXT = "https://user:secret@example.invalid/private?token=secret";
const GENERIC =
  "MCP_VERIFICATION_FAILED: Verification failed; inspect the verification inputs and server lifecycle diagnostics.";

test.each([
  ["ENOTFOUND", "MCP_DNS_LOOKUP_FAILED"],
  ["EAI_AGAIN", "MCP_DNS_LOOKUP_FAILED"],
  ["ECONNREFUSED", "MCP_CONNECTION_REFUSED"],
  ["ETIMEDOUT", "MCP_CONNECTION_TIMED_OUT"],
  ["ENOENT", "MCP_FILE_NOT_FOUND"],
])(
  "classifies SDK cause chains for %s without disclosing exception text",
  (code, category) => {
    const cause = Object.assign(new Error(PRIVATE_TEXT), { code });
    const error = new SdkError(
      SdkErrorCode.EraNegotiationFailed,
      PRIVATE_TEXT,
      undefined,
      {
        cause: new TypeError(PRIVATE_TEXT, { cause }),
      },
    );
    const result = formatMcpVerificationFailure(error);
    expect(result).toMatch(new RegExp(`^${category}: `));
    expect(result).not.toContain(PRIVATE_TEXT);
    expect(result).not.toContain("secret");
  },
);

test("uses a fixed fallback for unknown and primitive failures", () => {
  for (const error of [
    null,
    undefined,
    PRIVATE_TEXT,
    new Error(PRIVATE_TEXT),
    { code: PRIVATE_TEXT },
  ]) {
    expect(formatMcpVerificationFailure(error)).toBe(GENERIC);
  }
});

test("terminates cyclic and excessively deep cause chains", () => {
  const cycle = new Error(PRIVATE_TEXT);
  cycle.cause = cycle;
  expect(formatMcpVerificationFailure(cycle)).toBe(GENERIC);
  let deep = { code: "ENOTFOUND" };
  for (let index = 0; index < 8; index += 1) deep = { cause: deep };
  expect(formatMcpVerificationFailure(deep)).toBe(GENERIC);
});

test("handles throwing properties and never reads exception messages or stacks", () => {
  const error = {
    get message() {
      throw new Error(PRIVATE_TEXT);
    },
    get stack() {
      throw new Error(PRIVATE_TEXT);
    },
    get code() {
      throw new Error(PRIVATE_TEXT);
    },
    cause: { code: "ECONNREFUSED" },
  };
  expect(formatMcpVerificationFailure(error)).toMatch(
    /^MCP_CONNECTION_REFUSED: /,
  );
  expect(
    formatMcpVerificationFailure({
      get cause() {
        throw new Error(PRIVATE_TEXT);
      },
    }),
  ).toBe(GENERIC);
});

test("verifier CLI reports sanitized failure on stderr and preserves exit status", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          "../scripts/verifyUniversalOntologyMcpApplicationBundle.js",
          import.meta.url,
        ),
      ),
      `--unknown=${PRIVATE_TEXT}`,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe(
    `Universal Ontology MCP application-bundle verification failed: ${GENERIC}\n`,
  );
});

test("verifier CLI classifies an actual missing bundle without exposing its path", () => {
  const missingPath = join(tmpdir(), `private-mcp-bundle-${randomUUID()}.mjs`);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          "../scripts/verifyUniversalOntologyMcpApplicationBundle.js",
          import.meta.url,
        ),
      ),
      "--application-bundle",
      missingPath,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("MCP_FILE_NOT_FOUND:");
  expect(result.stderr).not.toContain(missingPath);
  expect(result.stderr).not.toContain("private-mcp-bundle");
});
