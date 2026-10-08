# Sources, provenance and verification boundaries

Research checked on 2026-09-07. Statements in `engineering-principles.md` are the
repository owner's approved integration policy. In particular, non-waivable semantic naming
and the default prohibition on shims are deliberate requirements, not claims that
an external standard universally mandates them. Tool documentation supports the
specific integration points below; it does not prove agent compliance or comparative
scanner superiority. The host's installed version remains authoritative for use.

## Current primary sources

| ID | Source | Use in this update |
|---|---|---|
| S01 | [OpenAI: Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) | Named custom-agent TOML, scope, permissions, concurrency and model inheritance; natural-language delegation, not an invented shell spawn command. |
| S02 | [OpenAI: Hooks](https://learn.chatgpt.com/docs/hooks) | Stop input/output, `stop_hook_active`, exit 2 continuation, commandWindows and git-root-relative hook invocation. Hooks are not a complete enforcement boundary. |
| S03 | [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills) | Bounded reusable skills and explicit invocation metadata. |
| S04 | [OpenAI: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | Repository instructions and scoped agent context. Verify this path through the current documentation index if it moves. |
| S05 | [OpenAI: Codex Security plugin](https://learn.chatgpt.com/docs/security/plugin) | Complete plugin installation, separate chats, distinction from cloud/standalone CLI. |
| S06 | [OpenAI: Review code changes for security](https://learn.chatgpt.com/docs/security/plugin/code-changes) | `codex plugin add codex-security@openai-curated`, `$codex-security:security-diff-scan`, frozen targets and native evidence bundles; documented trusted-CI command. |
| S07 | [OpenAI: Fix findings](https://learn.chatgpt.com/docs/security/plugin/fix-findings) | Finding-scoped remediation with checks and retained evidence. |
| S08 | [OpenAI: Export and track findings](https://learn.chatgpt.com/docs/security/plugin/export-findings) | Native bundle and controlled handoff; do not mutate original evidence or publish by default. |
| S09 | [OpenAI public plugin source](https://github.com/openai/codex-security/tree/main/plugins/codex-security) | Reference for version-specific skill/schema contracts. Repository main is NOT a pin to the installed plugin. |
| S10 | [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) | Naming clarity, design fit, complexity and test review. Supports the mechanism, not this policy's non-waivable authority. |
| S11 | [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) | Syntax/semantic distinctions, framework validators, schemas and boundary validation. Consumer validation does not replace authorisation or business constraints. |
| S12 | [JSON Schema getting started](https://json-schema.org/learn/getting-started-step-by-step) | Standard schema vocabulary instead of a private schema interpretation. |
| S13 | [python-jsonschema validation](https://python-jsonschema.readthedocs.io/en/stable/validate/) | `Draft202012Validator`, `check_schema`, `FormatChecker`, error reporting. |
| S14 | [PyYAML documentation](https://pyyaml.org/wiki/PyYAMLDocumentation) | `safe_load`/`safe_dump` for generated metadata; no line-based shadow YAML parser. Comments/formatting need not survive generated-output serialization. |
| S15 | [npm exec](https://docs.npmjs.com/cli/v12/commands/npm-exec/) | Project-local CLI invocation and `--no`; this does not itself pin a dependency version. |
| S16 | [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use) | Least-privilege, untrusted inputs and pinned action references. |
| S17 | [GitHub REST pull requests](https://docs.github.com/en/rest/pulls/pulls) | Live PR metadata and changed-files pagination/limits; incomplete listings must fail visibly. |
| S18 | [GitHub REST repository contents](https://docs.github.com/en/rest/repos/contents) | Read exact baseline blobs at full commit references without executing candidate code. |
| S19 | [BCP 14 / RFC 8174](https://www.rfc-editor.org/rfc/rfc8174.html) | Uppercase normative keyword convention. |

The root `.codex/config.toml` and hook fields are documented interfaces checked here,
not instructions transplanted from Claude Code. Actual hosted/CLI/plugin availability,
trust settings and enterprise policy can differ. Use the current installed consumer
for validation. Do not silently add compatibility fallbacks when it rejects a key.

## Concrete action references

The following tag references were resolved through GitHub's public API on the research
date. Resolution identifies an immutable candidate; it is not a source-code audit:

| Action tag | Resolved commit |
|---|---|
| actions/checkout v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-python v7.0.0 | `5fda3b95a4ea91299a34e894583c3862153e4b97` |
| actions/github-script v9.0.0 | `3a2844b7e9c422d3c10d287c895573f7108da1b3` |
| actions/setup-node v7 | `820762786026740c76f36085b0efc47a31fe5020` |

Exact pins are in the repository workflow files. They establish selected source
identity, not a security audit or proof of GitHub runner execution.

## Source material and selected skills

The source package is codex-sdlc 1.0.0, pre-release, not deployed. The exact import
ledger is [.sdlc/SOURCE_PACKAGE.json](../../.sdlc/SOURCE_PACKAGE.json), including
source and adapted destination identities. Source files remain unchanged.
The MOT/OUT/REQ/AC/QA/DEC/SLICE/EV vocabulary supports material work without making
all identifiers mandatory for small tasks.

Adapted TDD retains its MIT licence and UPSTREAM.json, including upstream commit
`b36e0829c6d0140e93cfef2ca599b1b07d4a7797`. Upstream hashes identify upstream files,
not our adapted skill. All six local skills are activated; other existing
standalone skills and lock entries are preserved except the external TDD duplicate.
Moving external refs have not been fabricated into an immutable lock. Refresh
requires their own reviewed resolution; see the repository toolchain assessment.

## Evidence classification

- Owner policy: semantic naming, default no shims, proportionate route, reuse and
  outcome decisions, scanner ownership and cleanup obligations.
- Primary tool evidence: supported plugin/hooks/agents commands, schemas, native
  parsing and GitHub API semantics listed above.
- Engineering inference: earlier outcome checks and native validation reduce
  opportunities for drift; effectiveness must be evaluated locally.
- Local execution evidence: [current repository verification](verification.md). No
  source-package validation logs or illustrative product are imported as evidence.
- Not executed: live Codex behavioral trials, native host trust acceptance,
  plugin installation/security scans, or GitHub deployment/merge protection.
  Repository setup and Windows checks have their own actual results in that record.

No throughput, vulnerability-detection or global-optimality claim follows from
these unit tests. Hashes and structured records identify artefacts, not truth or approval.

## DCG update, September 7, 2026

The exact native release, source commit and documentary sources used for CMD-01 are
listed in [command-safety.md](command-safety.md). Upstream configuration/schema and
Codex hook docs determine their own contracts; this package supplies a deployment
policy and integration probe, not another parser/classifier or an upstream audit.

## Current software-selection sources (checked 2026-09-07)

See [toolchain selection](toolchain-selection.md) and [package reuse assessment](package-reuse-assessment.md)
for current versions, licence evidence, rejected alternatives and open integration gaps.
Those are research records, not signatures, complete SBOMs or legal approval.
