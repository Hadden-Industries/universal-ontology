# Codex Security in this pipeline

Normative integration: SEC-01. Official OpenAI plugin behaviour was checked on
2026-09-07; see `sources.md`. This integration does not claim a benchmark victory
or that the plugin is installed in your environment. CLI/UI/version availability
must be checked on the actual host. This package installs no plugin remotely.

## Install the complete supported plugin

```text
codex --version
codex plugin add codex-security@openai-curated
codex
```

Inside interactive Codex, `/plugins` exposes plugin management. Start `/new` for
a separate assessment. Do not extract security skills into `skills-lock.json` or
`.agents/skills`; the plugin's MCP server, scripts, references and native artifact
contracts are part of the capability. Keep standalone skills managed separately.
Record actual Codex/plugin/model versions and configuration with scan evidence.
Do not fabricate a pin flag or assume repository `main` equals the installed build.

## Trigger and ownership matrix

| Situation | Default action |
|---|---|
| R0, non-security change | Ordinary principles/correctness review; no mandatory scan. |
| Security-relevant change at any size | `$codex-security:security-diff-scan` for the frozen change and directly relevant support code. |
| New repository/component assessment | `$codex-security:security-scan` for an authorised scope. |
| Higher assurance with explicit budget | Consider the installed plugin's deep scan; do not multiply full scans per reviewer/finding. |
| Accepted security finding | One `$codex-security:fix-finding` task. TDD can implement a delegated regression/repair slice. |
| Existing proposed fix | Separate `$codex-security:verify-fix`; no edits during verification. |
| Cross-system requirements or unclear coverage | `security_requirements_reviewer`, not another generic vulnerability scan. |

Security-relevant means auth/authorisation, tenant isolation, trust boundaries,
parsers/input validation, secrets, privileged filesystem/network/execution, sensitive
data, important dependency or CI/agent-permission changes. A harmless identifier
rename need not automatically require a full security campaign; examine reach and
contract effects. Missing required capability blocks the assurance claim until an
accountable alternative is accepted. Keep existing deterministic security checks.

## Freeze the target and assess

Use a separate authorised disposable checkout if assessment may execute untrusted
code or create PoCs. Fetch required commits through normal authorised access.
Record full SHAs; `HEAD` and branch names are moving references, not durable identity.
For a clean committed branch, for example in PowerShell:

```powershell
git fetch origin
$Base = git merge-base HEAD origin/main
$Head = git rev-parse HEAD
"Base: $Base`nHead: $Head"
```

Provide actual values in the prompt:

```text
Use $codex-security:security-diff-scan.
Review BASE=<full SHA> to HEAD=<full SHA>, with accepted brief/baseline <reference>.
I am authorised to assess this repository and these revisions.
Use the approved threat/deployment assumptions <reference>.
Leave the source checkout unchanged. Do not fix, publish findings, create issues,
change SECURITY.md, expand credentials or deploy.
Use the plugin's own bounded scan orchestration. Do not start a second outer scan.
Return native artifacts and explicit target/coverage/proof gaps. Distinguish runtime
reproduction from source-supported analysis. Preserve counterevidence.
```

These namespaced skill invocations and the installation command are documented
OpenAI interfaces. The boundaries and trigger matrix above are our policy. Do not
promise a `fork_turns` option in user commands; internal plugin delegation is not
a stable user-facing CLI contract. A new chat avoids handing the full implementation
conversation to the assessor, but does not provide organisational independence.

## Bounded security assessment

When a separate reviewer is authorized, the coordinator prepares the compact
handoff, selects the assessment route below, starts one authorized reviewer, waits, then
checks the returned target, coverage, findings and evidence bundle. The reviewer
owns the selected review and, for native scans, its preflight and phase tools; the coordinator does not
repeat those phases. If delegation is prohibited, use only an accepted parent
fallback and report the lack of independent review. Assess time and usage across
the coordinator and reviewer, with unavailable measurements stated explicitly.

For a small R0/R1 diff that fits one combined review, use an initial ten-minute
assessment budget unless the accepted task specifies another. Start at the inventory precheck;
exclude explicit waits for user input and record those waits separately. Preserve
the budget across retries and continuations. At five minutes, include remaining
coverage and recovery time in the normal progress update. At the next safe tool
boundary after exhaustion, preserve an incomplete handoff for the same assessment.
A larger scope needs an appropriate stated budget; elapsed time never grants approval.

- Supply a compact brief: exact target, accepted requirements, changed paths,
  relevant threat assumptions, permissions and evidence references. Request a
  threat model scoped to that change and its directly relevant support. Use a
  fresh assessment task only when its creation is authorized; otherwise retain
  the parent-review limitation. Inherit the selected model effort and delegation
  limits. Read required native guidance once, refreshing only changed contracts.
- Before starting a live review, obtain Git's complete changed-path list for the
  agreed diff semantics, including deletions and both sides of renames. Run the
  installed plugin's own inventory helper for that frozen target; do not copy its
  exclusion rules or implement another selector. Compare paths, not only counts.
  Every omission needs a scope disposition. Missing required paths, even from a
  nonempty inventory, make the native route unavailable for complete assessment.
  After native launch, complete its required preflight and artifact steps; read
  every native inventory page and verify it still accounts for the required paths.
- Before source analysis, verify artifact access in the authoritative scan
  directory through each actual writer, runtime and identity. Prefer
  a supported native capability check; otherwise use one task-owned,
  non-sensitive create/read/delete probe within the authorized directory.
  A host-side pass proves only host-side access. For the confirmed Windows
  owner/sandbox mismatch, use the authorized artifact I/O procedure below.
  If no approved writer works, stop the native assessment and preserve its
  identity and failure evidence. Existing alternative-assessment rules still apply.
- While this inventory defect persists, bounded R0/R1 changes may use direct
  review of the same frozen diff by an authorized reviewer, retaining applicable
  deterministic checks, scope, permissions and review-independence requirements.
  This standing alternative applies only to the inventory omission; it does not
  bypass an access denial or another required assurance control. Label its method,
  reviewed paths, findings and limitations as an alternative assessment, not a
  successful native scan. R2/R3 or an explicit native-assurance requirement needs
  a separately accepted alternative. Preserve any already-started native scan and
  its failure evidence. Keep the upstream repair outstanding; after an upgrade,
  verify actual inventory coverage before returning affected work to the native route.
- Limit plugin troubleshooting to two minutes total within the scan budget and
  one documented recovery attempt per distinct failure. Attempt recovery only
  when the error and native contract identify a concrete correction. Required
  access still needs its existing authorization. A repeated failure or exhausted
  recovery budget produces the same scan's incomplete handoff with failure
  evidence, reviewed paths and remaining work. Further plugin diagnosis needs a
  separately accepted scope. Preserve native continuation and finalization rules;
  do not restart, mark failed/cancelled, or declare completion to clear a blocker.
  Use native tool-owned identity/sealing fields and supported artifact writers;
  do not patch plugin caches. Use only the approved alternative described above.

At handoff or completion, report wall-clock elapsed time and explicit user-wait
time separately. When native usage is available, report input tokens with cached
input identified as a subset, output tokens and the native total; mark unavailable
measurements as unavailable. These are usage measures, not a billing calculation.
Keep the native bundle and existing task record as the evidence; no extra report
or automated timer is required. Actual latency improvement remains unverified
until a subsequent authorized assessment exercises this procedure.

## Temporary Windows artifact I/O

For the owner/sandbox directory-access defect tracked in
[openai/codex#43791](https://github.com/openai/codex/issues/43791), an explicitly
approved host file operation may retain required supporting artifacts while
source analysis stays sandboxed. This continues the same native assessment;
it does not replace its required phases or accept missing evidence.

The [adoption record](adoption.md#codex-security-windows-artifact-access) retains
the successful fresh-scan qualification and its limits. Reuse that evidence only
for the matching host, writer and assessment scope.

- Bind each host operation to the existing scan ID, authoritative directory,
  exact destination, allowed file operations and frozen payload identity.
  Obtain any missing access approval before dispatch. Use existing operating
  system file tools; do not create a privileged service or wrap private plugin APIs.
- Treat payloads strictly as data. Preserve the reviewer's canonical threat model
  and conclusions. Run no repository code, tests or payloads with host access.
  Create new artifacts without overwriting existing evidence, then verify their
  bytes against the approved payload. Inspect a conflicting file and preserve it.
- Verify the actual artifact writer before analysis. Retain a denied sandbox
  check as a separate limitation; a successful host write does not clear it.
  Preserve the directory and its permissions, sandbox mode, DCG and hook controls.
  Delete only the named task-owned probe after its successful readback.
- Keep canonical findings, coverage, validation, sealing and report generation
  with the native plugin. Completion requires successful native finalization
  and retrieval of its completed bundle. Report its actual coverage and retained
  gaps; artifact access alone does not establish complete coverage. Leave failed
  attempts incomplete.
- Reuse still-valid assessment evidence when resuming a paused scan. Record the
  host identity, operations, artifact hashes, remaining gaps and elapsed time in
  the existing evidence. Preserve the normal review and recovery budgets.
- Reassess qualification after a relevant plugin, host, sandbox-identity or writer
  change. Retire the procedure after an upstream fix passes direct sandbox artifact
  I/O and native completion on a fresh authorized scan.

## Store and validate native evidence

The documented completed bundle includes `report.md`, `scan-manifest.json`,
`findings.json` and `coverage.json`, with additional finding/PoC or hardening material
when available. Preserve the **whole** bundle with original relative links and
hashes in an approved restricted store. It may originate under a temporary directory;
move/archive the complete evidence before ordinary scratch disposal or expiry.

Use the installed plugin's supported validation/finalisation and its matching
published schemas where automation consumes native JSON. Do not invent another
findings schema or treat `jq .findings | length` as a release gate. Our own PR form
stores a reference and outcome, not a competing representation of every finding.

Inspect actual target/revisions, coverage/deferred surfaces, validated reachability,
proof method, uncertainty, accepted security requirements and finding dispositions.
A zero-findings or finished scan is not a certificate. A hash verifies identity, not
truth. An accepted-risk or false-positive disposition is appended externally;
do not mutate the original scan bundle to erase an inconvenient finding.

`SECURITY.md` policy affects scanner assumptions. Review changes to it and any local
scope/exclusions against previously approved policy before assessment. A candidate
PR cannot approve its own exclusions. Follow the installed plugin's actual policy
locations; do not assume `.github/SECURITY.md` is its scanning configuration.

## Remediate and verify separately

```text
Use $codex-security:fix-finding for accepted finding <ID> in <original bundle>.
Work only on <authorised source revision/scope>. Preserve the original evidence.
Apply repository NAM-01, NSH-01, REU-01, VAL-01 and OUT-01. No implicit shim override.
Follow the plugin's remediation workflow. Use the adapted TDD procedure only for
its bounded implementation work; do not recursively start scanners or approvals.
```

Then in an independent verification session:

```text
Use $codex-security:verify-fix for finding <ID> from <original bundle> against
<fixed full SHA>. Do not edit source, tests, policy or issue trackers.
Check the original exploit path, nearby bypasses and legitimate behaviour.
Return the native result and proof gaps. Do not equate unit-test success with
runtime exploit verification, and do not publish or close the finding.
```

Keep the native verdict semantics of the installed version. Inconclusive/runtime
unavailable evidence remains a gap even when another narrower check passes.
Only the accountable SDLC authority dispositions the finding and authorises release.

## Permissions, costs and CI adoption

Prompts do not enforce filesystem isolation. Use least privilege, approved egress,
no production credentials, disposable execution and suitable write locations for
artifacts. A read-only source policy still needs writable build/evidence space.
Research access and scan execution must not imply permission to install/deploy.

Default adoption is explicit local scans plus retained references in the PR.
**No automatic credentialed security workflow is enabled by this package.**
Start CI only after validating the installed plugin, native output contract, quota,
budget, runner isolation and private evidence store. OpenAI documents `codex exec`
invocation; a reviewed example is:

```sh
CODEX_API_KEY="$CODEX_SECURITY_API_KEY" codex exec --sandbox workspace-write \
  'Use $codex-security:security-diff-scan to review BASE_SHA to HEAD_SHA. Do not modify the checkout.'
```

Replace the literal SHA placeholders before running. The single quotes protect the
skill's `$` from shell expansion. The documented provider API-key path is separate
from assuming a desktop subscription pays for unattended API usage. Budget and
credentials require explicit owner approval. Never pass scan credentials to code,
hooks, configuration or workflows from an untrusted PR. Same-repository membership
alone does not establish that a contributor is trusted with a credential.

Use a protected, independently reviewed pipeline definition and restricted identity.
Do not post raw vulnerability/PoC artifacts in a public PR or automatically upload
them to publicly readable workflow artifacts. Prefer a private security record or
advisory for undisclosed findings. The standard SDLC checklist may reference a
sanitised record. Review access, native schema/version and retention before adding
an automated scan-status gate. Repo-controlled hooks are not a security boundary.

## Evidence before mandatory automation

Evaluate useful authorized security work, retaining coverage gaps, false positives,
missed risks, regression results and task cost. The owner declined a synthetic
adoption pilot. Do not introduce mandatory automation or claim improved assurance
from these control tests alone. Keep deterministic checks and human acceptance.

## Distinct execution guard

[DCG](command-safety.md) protects supported command dispatch, not application code
correctness. A scanner or remediation agent remains subject to CMD-01. Do not disable
DCG to run exploit validation; use bounded disposable targets and independently
approved exact exceptions only when necessary. Neither an unblocked command nor a
clean security scan permits cleanup, publication, merge or release without authority.
