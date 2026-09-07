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
