const FAILURE_EXPLANATIONS = new Map([
  [
    "ENOTFOUND",
    "MCP_DNS_LOOKUP_FAILED: Name resolution failed; check the configured endpoint and DNS availability.",
  ],
  [
    "EAI_AGAIN",
    "MCP_DNS_LOOKUP_FAILED: Name resolution failed; check the configured endpoint and DNS availability.",
  ],
  [
    "ECONNREFUSED",
    "MCP_CONNECTION_REFUSED: The connection was refused; check that the configured service is listening.",
  ],
  [
    "ETIMEDOUT",
    "MCP_CONNECTION_TIMED_OUT: The connection timed out; check service availability and network reachability.",
  ],
  [
    "ENOENT",
    "MCP_FILE_NOT_FOUND: A required file was not found; check the application bundle and executable paths.",
  ],
]);
const GENERIC_FAILURE =
  "MCP_VERIFICATION_FAILED: Verification failed; inspect the verification inputs and server lifecycle diagnostics.";
const MAXIMUM_CAUSE_DEPTH = 8;

function readFailureProperty(error, name) {
  try {
    return error[name];
  } catch {
    return undefined;
  }
}

/** Return only fixed diagnostic text, never exception messages, stacks or paths. */
export function formatMcpVerificationFailure(error) {
  const seen = new Set();
  let current = error;
  for (let depth = 0; depth < MAXIMUM_CAUSE_DEPTH; depth += 1) {
    if (current === null || typeof current !== "object" || seen.has(current))
      break;
    seen.add(current);
    const explanation = FAILURE_EXPLANATIONS.get(
      readFailureProperty(current, "code"),
    );
    if (explanation !== undefined) return explanation;
    current = readFailureProperty(current, "cause");
  }
  return GENERIC_FAILURE;
}
