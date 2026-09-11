# MCP candidate version authority configuration addendum

Status: approved by Max on 2026-09-09. **MCP-CONFIG-02**. Max selected
"Approve MCP-CONFIG-02 and continue the accepted MCP implementation" in response
to the exact three-edit question linked to this addendum. This records approval
of the proposed setting; implementation and final verification follow below.
This is a bounded addition to the accepted
[MCP implementation plan](2026-09-08-mcp-workspace-modernization.md), SLICE-004,
and [MCP-CONFIG-01](2026-09-08-mcp-workspace-configuration-proposal.md), section 6.
It uses Issue 25 baseline v2; it does not replace accepted requirements or create
another implementation route. The repository-adapted TDD skill owns execution.

**Goal:** derive development MCP artifact versions from the public MCP package,
while retaining agreement with Registry/distribution metadata and the root-owned
build toolchain.

**Architecture:** the existing inline Node metadata step keeps its current job,
inputs and output names. The MCP workspace manifest supplies `software-version`;
the root manifest still supplies `packageManager`. No new helper, dependency,
workflow event or delivery mechanism is needed.

**Technology:** the existing YAML workflow, pinned Node 24.20.0 and npm 12.0.2,
native Node filesystem/process APIs and the existing YAML consumer in tests.

## Why another exact approval is needed

The accepted package ownership design explicitly removes root/public version
equality as a product invariant. The next slice must update every consumer of
that assumption. Inspection found the same assumption in the development
distribution workflow, in addition to the already identified source consumers.

Root [AGENTS.md](../../AGENTS.md) requires explicit approval for exact configuration
changes. The accepted plan states: "No SDLC version/status, Registry identity,
Docker payload or publishing/workflow change is presumed necessary." It requires
an exact proposal if a further consumer needs one. MCP-CONFIG-01 names the moved
builder's settings and consumer updates, but does not name this workflow setting.

## Exact configuration change

Modify only `jobs.validate.steps[id=candidate-metadata].run` in
[verify-universal-ontology-mcp-distribution.yml](../../.github/workflows/verify-universal-ontology-mcp-distribution.yml).
Apply these three edits to its existing Node body:

```diff
 const versions = [
-  rootPackage.version,
   distributablePackage.version,
   serverDocument.version,
   ...serverDocument.packages
     .map(({ version }) => version)
     .filter((version) => version !== undefined),
 ];
-if (versions.some((version) => version !== rootPackage.version)) {
+if (versions.some((version) => version !== distributablePackage.version)) {
   throw new Error("Development candidate versions disagree.");
 }
```

```diff
-    `software-version=${rootPackage.version}`,
+    `software-version=${distributablePackage.version}`,
```

The YAML indentation enclosing this existing Node body remains as it is.
`rootPackage.packageManager`, the Registry name check, Git-derived source epoch,
target matrix and failure messages remain in that same step.

With root version `99.0.0` and coherent MCP/Registry version `1.0.0`, the step will
emit `software-version=1.0.0`. A disagreement within MCP/Registry versions or the
selected npm toolchain will still fail before writing outputs. All current
versions are `1.0.0`, so the accepted change preserves today's candidate names;
it allows subsequent root and MCP version changes to have distinct authorities.

No permissions, concurrency, events, jobs, action pins, execution environments,
publication settings, current version values or SDLC controls change. The output
continues to name archive, container and assembled development artifacts. This
proposal does not authorize pushing or executing GitHub workflows.

## Consumer-complete implementation within SLICE-004

The already accepted source updates must retain product/distribution identity
agreement while removing only root software-version coupling:

| Consumer | Required responsibility |
|---|---|
| Moved MCP metadata module and bundle builder | Read/project the MCP workspace manifest's version. |
| `scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js` | Keep MCP package/Registry/runtime/archive agreement and root toolchain authority. |
| `scripts/distribution/createUniversalOntologyMcpSpdxSbom.js` | Keep SBOM/OCI/package/Registry agreement; root version is not an MCP artifact authority. |
| `scripts/distribution/verifyUniversalOntologyMcpRelease.js` | Preserve tag/package/Registry/release evidence agreement and root npm authority. |
| Existing package, Registry, archive, SBOM and release-verifier tests | Independently assert the product identities and meaningful disagreement failures. |
| `tests/distribution/universal-ontology-mcp-distribution-workflow.test.js` | Execute the actual metadata Node body in owned fixtures, including distinct root/MCP versions and retained failure cases. |

These source/consumer updates remain part of the previously accepted slice; this
addendum requests only the additional exact workflow setting above. If another
unlisted configuration setting proves necessary, it needs its own exact decision.

## Evidence obtained before approval

On the current `79d187802f9255134c03d0786ff75181ed1070ee` base and query-repair
workspace, a local harness parsed the actual workflow with the installed YAML
parser, extracted the single existing Node body and executed that body using the
selected Node executable. The candidate body applies exactly the three edits
shown above. The live workflow file was not modified.

Six scenarios produced their independently expected outcomes:

| Actual body / fixture | Observed result |
|---|---|
| Current body; current matching versions | Successful exact version/epoch/matrix outputs. |
| Current body; root `99.0.0`, MCP/Registry `1.0.0` | Fails `Development candidate versions disagree.` |
| Proposed body; root `99.0.0`, MCP/Registry `1.0.0` | Successful `software-version=1.0.0`, same epoch/matrix. |
| Proposed body; Registry version differs | Same version-disagreement failure; no output file. |
| Proposed body; npm Registry package entry differs | Same version-disagreement failure; no output file. |
| Proposed body; root npm selection differs | Same toolchain/Registry-identity failure; no output file. |

This is execution of the actual inline JavaScript and proposed text edits in local
fixtures. It is not a GitHub-hosted workflow run or release qualification.
Raw output and exact current/proposed bodies are retained under
`.sdlc/runtime/mcp-modernization/candidate-version-*`; the task checkpoint records
the harness, fixture ownership and identities.

After approval, integrate the exact workflow edit together with SLICE-004's source,
tests and documentation. Promote the real-body fixture scenarios into the existing
workflow suite; keep the old-body failure evidence. Run the affected workspace,
package, Registry and distribution suites using native npm commands, then the
fresh R2 full profile after the last relevant edit. Obtain the accepted independent
review/verification. Local execution does not grant commit, push, installation,
publication or deployment authority.

This was the next actual configuration decision. The separate assessment of SDLC
parallel execution does not authorize policy changes or changes to the SHACL task.
