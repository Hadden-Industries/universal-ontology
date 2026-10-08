# SDLC-BOOTSTRAP-01

Approved repository integration, 2026-09-07. The owner authorized proceeding and
then explicitly approved the corrected exact setup-script and configuration diff.
The later instruction that the test expecting `required = true` was wrong is
incorporated: the MCP generator continues to omit that setting.

## Identity and scope

Repository: Hadden-Industries/universal-ontology, origin
https://github.com/Hadden-Industries/universal-ontology.git. Editing starts at
C:\Users\maksy\GitHub\universal-ontology, main,
591ae52faafafeb6d3b4bf1b9eae4da195b0b076, with the pre-existing user AGENTS.md edit
preserved. The directories were resolved and inspected as real directories on
native Windows, not inferred from names or translated through WSL.

Source: C:\Users\maksy\Downloads\codex-sdlc-v1.0.0.
README, PACKAGE_STATUS.json, implementation/how-to guides and actual files
establish its identity. Source SHA256SUMS digest:
`81c0c0ff10c4ed0b62df19b316bc95b1575552264eab0ceadd15fcacb8446453`.
[The import ledger](../../.sdlc/SOURCE_PACKAGE.json) gives every selected source,
destination and original SHA-256; the source was not edited.
[Package status](../../.sdlc/PACKAGE_STATUS.json) remains exactly 1.0.0,
pre-release, deployed false, deploymentConfirmation null.

## Exact local configuration

The actual files linked here are the reviewable final values; the working-tree
diff shows adaptations to pre-existing files.

| Target | Final value / source | Behavioral effect |
|---|---|---|
| [AGENTS.md](../../AGENTS.md), [REVIEW.md](../../REVIEW.md) | Existing safety instructions plus repository SDLC routing and all agreed principles; source review policy adapted to available capabilities | Preserve exact approval rules, select sole local TDD, proportionate evidence and truthful limits. |
| [package.json](../../package.json) | Add skills devDependency exactly 1.5.24 and eight SDLC/setup/test scripts; retain all original scripts, identity and product dependencies | npm entry points dispatch through the repository interpreter. |
| [package-lock.json](../../package-lock.json) | Native npm 12.0.2 lock adds only skills 1.5.24; existing tar/yaml satisfy its dependencies | Preserve locked product graph. |
| [.node-version](../../.node-version), [.python-version](../../.python-version) | 24.20.0 and 3.14.7 | Selected runtime targets checked before bootstrap installs. |
| [requirements-sdlc.txt](../../requirements-sdlc.txt) | jsonschema==4.26.0, PyYAML==6.0.3, rfc3339-validator==0.1.4, rfc3986-validator==0.1.1 | Separate SDLC dependencies, existing .venv and requirements.txt retained. |
| [skills-lock.json](../../skills-lock.json) | Remove only external test-driven-development entry from obra/superpowers at main | Local adapted TDD is sole selected implementation source; all other entries preserved. |
| [.sdlc/skill-policies.json](../../.sdlc/skill-policies.json) | version 1; defaultAllowImplicitInvocation false; overrides {} | All six local skills explicitly selected when relevant. |
| [.sdlc/pipeline-policy.json](../../.sdlc/pipeline-policy.json) | Source unchanged: R0 focused, R1 affected, R2/R3 full and prior baseline | Minimum route controls; task behavior evidence remains independently required. |
| [.sdlc/verification.json](../../.sdlc/verification.json) | Exact argv, names and timeouts in the linked file | Existing product commands plus source control tests; full uses direct Vite without auto-fixes and never deploys. |
| [.sdlc/codex/config.toml](../../.sdlc/codex/config.toml) → [.codex/config.toml](../../.codex/config.toml) | approval_policy on-request; sandbox_mode workspace-write; agents.enabled true, max_concurrent_threads_per_session 4, default_subagent_reasoning_effort high, interrupt_message true | Merge two owned blocks, preserve existing network/MCP settings and unrelated bytes. No model pin or MCP required=true. |
| [.sdlc/codex/agents](../../.sdlc/codex/agents) → [.codex/agents](../../.codex/agents) | Eight exact source roles listed in ledger: principles_reviewer, repo_explorer, researcher, review_maintainability, review_operability, security_requirements_reviewer, test_oracle_reviewer, verifier | Native roles; source sandbox/reasoning settings preserved. Verifier permits workspace build artifacts but forbids tracked edits. No agent spawned during adoption. |
| [.sdlc/codex/rules/default.rules](../../.sdlc/codex/rules/default.rules) → [.codex/rules/default.rules](../../.codex/rules/default.rules) | gh issue delete forbidden; gh pr merge prompt; gh issue edit prompt | Three lifecycle rules; not an exhaustive safety classifier or control of API/browser paths. |
| [.sdlc/codex/hooks.json](../../.sdlc/codex/hooks.json) → [.codex/hooks.json](../../.codex/hooks.json) | One Stop group, timeout 30, statusMessage Checking current SDLC verification evidence; exact generated commands in destination | Node launcher executes .venv Python from Git root. Windows command uses native PowerShell path/cwd handling. Preserve unrelated Stop and PreToolUse hooks. |
| [.gitignore](../../.gitignore) | Repository transaction staging/backup patterns; /.sdlc/runtime/ and /.sdlc/tmp/ | Ignore owned operational artifacts; no automatic deletion. |
| [.github/ISSUE_TEMPLATE](../../.github/ISSUE_TEMPLATE) and [PR template](../../.github/PULL_REQUEST_TEMPLATE.md) | Source change/bug forms; actual repository security URL; seven explicit PR metadata fields | Native forms. Risk/functionality require an actual selection; R0/R1 may use PR brief without an Issue. Backlog structure is not authority. |
| [.github/dependabot.yml](../../.github/dependabot.yml) | Source unchanged: npm, pip, github-actions; /; daily; default-days 0; open PR limit 10 each | One native update service, no auto-merge. Owner confirmed no existing organization coverage. |
| [.github/CODEOWNERS](../../.github/CODEOWNERS) | Exact path/team map in file using engineering-governance and security teams | Declares policy ownership; does not grant team access or enable required reviews. |
| [sdlc-control-tests.yml](../../.github/workflows/sdlc-control-tests.yml) | Ubuntu/Windows; exact version files; pinned actions; contents read; native npm lock and .venv; no example product | Fixture controls and bootstrap/launcher/workflow tests. |
| [sdlc-pr.yml](../../.github/workflows/sdlc-pr.yml) | pull_request metadata events; read permissions; check out exact base; .venv; gh reads of head baseline blobs | Trusted base linkage validation; never execute candidate code with its token. |
| [sdlc-issue-acceptance.yml](../../.github/workflows/sdlc-issue-acceptance.yml) | Source unchanged: issues edited title/body; issues write; pinned github-script | Remove accepted lifecycle state, mark changed and explain reacceptance. It does not rerun old PR checks. |
| [.sdlc/dcg](../../.sdlc/dcg) | Inert source policy/probe assets; owner-use decision recorded in UPSTREAM.json and assessment | No vendored DCG binary, substitute classifier or claim of accepted host interception. |

## Source-to-destination and code adaptation

All six skill directories and TDD licence/provenance are included. .sdlc/skills is
the durable source; .agents/skills is the ignored Codex activation directory.
Activation updates only declared local files and preserves other standalone skills.
No duplicate local TDD discovery root or extracted Codex Security skill is added.

The existing scripts/set_up_mcp_servers.py transaction is reused and its shared
configuration/lock interfaces receive names matching their broader responsibility.
No aliases or parallel transaction implementation are added. New set_up_sdlc.py
owns SDLC merge semantics; set_up_agent_skills.py preserves roots, uses native YAML
and the exact installed Skills CLI. setUpDevelopmentEnvironment.js remains the
entry point and calls SDLC setup only after dependencies are installed.

The imported lifecycle, Stop gate, PR reader, label helper and inert DCG protocol
probe remain Python. The PR reader is adapted for base/head movement and renamed
baseline immutability. Existing tests and new contract fixtures cover those
adaptations. No Python-to-JavaScript control rewrite is bundled here.

Source illustrative application, old validation logs, synthetic evaluation corpus,
README replacement, example package identity, CODEOWNERS placeholders and source
setup replacements are omitted. Source IMPLEMENTATION_GUIDE/SDLC_HOWTO inform
[the repository guide](howto.md); they are not recursively copied. Generic
principles remain in docs/sdlc and local skills; ontology-specific commands and
invariants remain in repository profiles/product validators.

## Dependency-ordered application and evidence

1. Preserve the initial tree; record exact source identities and approval.
2. Add local policies, schemas, skills and retained provenance; adapt existing
   setup/scripts with contract tests. Keep Python controls behind npm.
3. Resolve skills with npm 12.0.2 and install SDLC requirements into existing .venv.
4. Run setup:sdlc, verify its generated outputs and existing MCP configuration.
5. Run control, product, ontology, build/generation and MCP checks. See
   [actual verification](verification.md) for commands, failures and limits.
6. Review the final local diff before any separately authorized commit/push.

## Independent host and GitHub actions

Local dependency installation changes node_modules, npm's task cache and .venv.
It does not change global npm, the PATH Codex CLI, plugins, user hooks, trust or
managed permissions. The CLI update and native hook acceptance still need actual
host execution; Codex Security account permissions and live scans remain separate.

The two real GitHub teams were created during the preceding approved work.
Explicit repository write grants remain unverified/pending. A single member cannot
supply an independent second human approval or approve their own GitHub PR.
Do not enable a self-blocking approval rule and silently bypass it; the owner must
choose an operable reviewer/administrative arrangement.

Label bootstrap, remote adoption of workflows/forms/Dependabot, team permissions,
required checks and private reporting settings are external actions. No remote
Issues, labels, PRs, settings or scans were changed by this local implementation.
The label helper's exact 14 names/colors/descriptions are in
[scripts/bootstrap_github_sdlc.py](../../scripts/bootstrap_github_sdlc.py).

The new linkage check needs trusted code already on main. Review the bootstrap
under the existing protections and the owner's exact configuration approval.
Its initial PR cannot validate through absent base code: failure is expected;
never add a skip-as-success or use candidate policy as a substitute. Keep all
existing required checks. Only after trusted files are merged and a subsequent
real PR demonstrates the new check should the owner configure it as required.
No approval, protected baseline or default-branch deployment is fabricated here.

Issue edits can stale earlier green PR results. Before merge/release, re-read
accepted intent and rerun linked checks. Auto-merge stays out of this integration.
No cross-repository distribution, webvowl changes, release notes, version changes,
commits or pushes are part of this local application.
