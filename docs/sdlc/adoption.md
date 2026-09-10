# Repository SDLC adoption

This is the repository's operational adoption record. The machine-readable status
and owner confirmation are in [PACKAGE_STATUS.json](../../.sdlc/PACKAGE_STATUS.json).
Max's approval of SDLC-FOLLOWUPS-01 confirms deployment of the experimental 1.0.0
workflow in Hadden-Industries/universal-ontology. Its pre-release status continues.

Deployment here means repository instructions, local skills, approved host controls
and the GitHub PR workflow are in use for real work. Product release, registry
publication, cloud deployment and adoption in other repositories require their own
authority. Source-package manifests and the 2026-09-07 bootstrap evidence retain
their historical identities and are not records of current host acceptance.

## Evidence and scope

Checked 2026-09-08 against main `17d49e9e63aa2f0277cfaa3e65b8db78b77b7557`.
[PR 21](https://github.com/Hadden-Industries/universal-ontology/pull/21) preserves
the DCG pack; [PR 22](https://github.com/Hadden-Industries/universal-ontology/pull/22)
contains the Windows artifact procedure; [PR 23](https://github.com/Hadden-Industries/universal-ontology/pull/23)
repairs the external fast-uri dependency. All 18 PR 23 checks and all three
post-merge workflows passed. GitHub marked dependency alerts 9–12 fixed.

The owner confirmed the repository Stop hook through Codex's native hook review
in this adoption task. That confirmation and observed use are host evidence;
configuration parsing and passing SDLC fixtures alone do not prove instruction,
skill, reviewer or hook compliance on another host.

## Command safety

The owner approved SDLC-DCG-ACTIVATE-01 and performed the operator activation of
DCG 0.14.1. Native release-signature verification succeeded. The retained record
`.sdlc/runtime/verification/dcg-host-interception-20260908093950.json` records
35/35 inert protocol cases and one attributable native PreToolUse denial of the
hard-reset argument-order probe through the current Windows desktop
`functions.exec -> exec_command` path. Its deliberately absent target remained
absent; the repository and approved control files were unchanged.

Current binary, configuration, pack and hook hashes still match that record:

| Object | SHA-256 |
|---|---|
| DCG 0.14.1 executable | `46d8b7c9d9e16e87b1b7b47bbbadb22aecea0d9575f07c663e6f32bb3431a534` |
| Operator configuration | `07c8f7cf372c00b2a2fbdda40ed9a4637d541984195f68e3543290853e719e16` |
| Repository/operator hard-reset pack | `e62af55b59293b84194ded18117e4183f835922ca9f69d6fa829e7c124cff9aa` |
| User hook definition | `7ac64d496dd3fc4d7453629f167ddd6224c89e64fb9f47a0d227f9831fa54cef` |

This accepts only the recorded scope. Interactive stdin, other tools, worker
sessions, all command spellings and the full [acceptance matrix](dcg-acceptance.md)
remain unproved by that probe. Keep existing capability restrictions and separately
authorized operator routes on unproved surfaces. Missing or invalid external packs
can fail open; retain the recorded native validator advisories and counterevidence.
Reassess after a relevant binary, policy, hook, trust, permission or dispatch change.

Preserve the exact DCG licence and non-standard rider retained with the operator
receipt. The owner's use authorization does not assert an upstream licence exception.

## Codex Security Windows artifact access

Owner: Max. Upstream: [openai/codex 43791](https://github.com/openai/codex/issues/43791),
open at the recorded check. Use the [approved artifact procedure](codex-security.md#temporary-windows-artifact-io).

Plugin 0.1.23 completed fresh native diff scan
`a56c4746-a6e0-4c3a-aa33-edc0d40dd57e` for base
`14ab362401e3938bc74d4e5f0bde8d87395e1778` and head
`1d4f7c3d626dbd247304743443152f7d962605bd`. Native sealed-bundle retrieval was
rechecked successfully. Coverage was complete for that bounded change, with no
findings. The approved host operation copied only the accepted 4,558-byte threat
model, verified SHA-256
`e7fb956a496ba55b02018728c5649fa5f135ab9f3d77c13c4595bfdecb4978ad`,
and preserved directory ACLs. Source assessment stayed sandboxed.

Direct sandbox artifact access still failed. This qualification does not establish
finding-positive, whole-repository, deep-scan, unattended-CI or restart behavior.
Keep earlier failed and partial attempts in their original states. Each future host
file operation needs its own matching scan/path/payload authority; general commit
or push authorization does not grant that access.

Reassess when the plugin, Codex host, sandbox identity or artifact writer changes.
Retire the procedure only after a fresh authorized native scan demonstrates direct
sandbox artifact creation/readback and native completion without host assistance.
Use that next real review; no repeated diagnostic scan is required by this record.

## MCP SDK embedded fast-uri

Owner: Max. Upstream: [typescript-sdk 2036](https://github.com/modelcontextprotocol/typescript-sdk/issues/2036).
The registry still selects `@modelcontextprotocol/server@2.0.0` as latest.
Its published Ajv providers embed fast-uri 3.1.0 independently of the external
3.1.7 dependency repaired in PR 23. Installed ESM provider
`dist/ajvProvider-CEoC__sr.mjs` has SHA-256
`218157a99879a59cdea0b720a484dfe9989fa768f3d05318c2803b61705373fa`.

GitHub's advisory query for `fast-uri@3.1.0` returned seven high-severity
version matches: [q3j6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6),
[v39h](https://github.com/advisories/GHSA-v39h-62p7-jpjc),
[4c8g](https://github.com/advisories/GHSA-4c8g-83qw-93j6),
[v2hh](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx),
[7p8r](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7),
[jqff](https://github.com/advisories/GHSA-jqff-g426-hqxp), and
[f65p](https://github.com/advisories/GHSA-f65p-4m7j-42xc).
Version matches alone do not establish exploitability of this application.

The independent PR 23 review found no current application request path to the
affected resolver. `src/mcp/createUniversalOntologyMcpServer.js` registers
Zod-backed tools; it exposes no untrusted JSON-schema ingress or elicitation flow.
The SDK's lazy Ajv provider is used by its JSON-schema/elicitation interfaces.
The artifact reader uses native URL parsing, origin/containment checks and rejected
redirects. This is static reachability evidence, not exhaustive runtime proof.

Continue only within that assessed boundary. Reassess before adding elicitation,
untrusted JSON schemas, a custom JSON-schema validator, URI-based authorization or
fetch behavior, and on any SDK update or relevant advisory change. Existing native
Dependabot PRs supply the SDK-update checkpoint; do not add another updater.
An external npm override cannot replace bundled source. Rebuilding/forking the SDK
or injecting another validator would require a separately accepted integration.

Resolution requires a supported upstream release whose actual published providers
remove or patch the embedded code, refreshed native package/rights research, exact
dependency approval, and affected schema/MCP/distribution checks. Inspect the
published artifact and existing bundle inventory; a clean npm audit or edited
SBOM version label cannot establish this repair. Preserve accurate embedded
versions and full notices. The installed SDK LICENSE records Apache-2.0/MIT
transition terms and CC-BY-4.0 documentation terms; its registry MIT label alone
does not capture that text.

## Retention and completion boundary

Preserve the native sealed scan and its qualification receipt, the DCG operator
and host records, and the fast-uri RED/GREEN evidence under the existing protected
native store and ignored `.sdlc/runtime/verification` records. Keep failed
counterevidence and operator recovery inputs. Remove only spent task-owned
transport files after their last consumer finishes.

Repository adoption and actionable upstream reports complete these local follow-ups.
The two upstream defects remain open until their stated resolution criteria pass;
this record neither closes them nor grants an exception for new uses.

## WP1 evidence qualification

WP1 applies the already adopted method to the text-capture and verification
retention defects under [accepted Issue 32](baselines/issue-32/v1.json).
The implementation introduces version 3 run receipts and preserves historical
version 2 evidence; it does not change the active-task version, SDLC package
version, deployment confirmation, host trust or security-scan adoption claims.
The [verification record](verification.md#wp1-text-and-evidence-repair-2026-09-10)
distinguishes process/fixture checks from current-candidate full-profile, CI and
independent review obligations. A retained receipt does not authenticate approval
or establish an ontology/product outcome by itself.
