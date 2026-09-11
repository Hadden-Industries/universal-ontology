# MCP-CONFIG-03: bind the workflow guard to the approved candidate-version change

Status: approved by Max on 2026-09-09 in the reply "Approve MCP-CONFIG-03";
the exact one-value change is applied. Verification follows. This is a bounded
configuration follow-up within accepted Issue 25 baseline v2 and SLICE-004.

MCP-CONFIG-02's three approved edits are now applied to the distribution workflow.
The release verifier also pins a canonical SHA-256 digest of that entire workflow.
Its old digest correctly rejects the changed workflow. The affected distribution
run has 153 passing and 11 failing tests; all 11 failures report the reviewed
workflow-digest mismatch, before their later release assertions can execute.
They are not passing release evidence.

## Exact proposal

In `scripts/distribution/verifyUniversalOntologyMcpRelease.js`, replace only the
value of `EXPECTED_DISTRIBUTION_WORKFLOW_POLICY_MANIFEST_SHA256`:

```diff
-  "00a97e2d849dfb1e0aa254133fd75dca326b206879e6f4fb4f42a16a1b99da75";
+  "a8b2e426ced4d7d00f12df81ab948de2fd2c332a3254232fcbef8529d09a4da7";
```

The canonicalization is the verifier's existing recursive JSON serialization,
with object keys sorted by UTF-8 byte order after parsing YAML. The current
workflow file SHA-256 is
`094f1d802a8e2a67ca120d0e60ddb37687f4c51494660b8c599b168a45f57b5b`.
Its Git diff contains exactly MCP-CONFIG-02's three approved edits; no other
workflow setting changed. The proposed value was computed from those actual
bytes using the existing canonicalization rules.

The effect is to recognize the now-approved workflow as the expected policy.
The full-workflow digest check and all independent trigger, permission, action,
topology, content and publication restrictions remain enforced. Existing negative
workflow cases must still fail for their intended mutations after this edit.
No extra event, capability, job, command or publication authority is proposed.

This additional approval is required because [AGENTS.md](../../AGENTS.md) says
"NEVER create, modify, rename, or delete configuration files without the user's
explicit approval for the exact change." This source constant is executable
repository-policy configuration. MCP-CONFIG-02 expressly covers only its three
workflow edits and requires a separate decision for another unlisted setting.

After approval, apply this one replacement, run the actual release-verifier
positive and negative cases, and retain fresh full-slice evidence. No commit,
push, hosted workflow run, security scan or deployment is authorized here.

Evidence: `.sdlc/runtime/mcp-modernization/mcp-owner-distribution-regressions.log`.
Independent implementation continues while this exact guard update is pending.
