# Repository reuse and rights decisions

Assessment date: 2026-09-07. Technical selection, owner authorization and upstream
rights are separate records. [Selected versions](toolchain-selection.md) identify
the concrete consumers and primary release/licence sources.

| Capability | Existing/native and credible alternatives | Decision and exact custom gap |
|---|---|---|
| Python command access | Existing .venv and setup entry point; npm scripts can invoke a local process | Keep Python; add one Node launcher that selects only .venv, roots cwd and propagates exit status. A JavaScript rewrite would duplicate controls and require behavior-equivalence evidence without improving npm access. |
| Repository setup publication | Existing tested MCP configuration transaction; stdlib TOML/JSON parsing | Compose that transaction. Rename its shared types/functions to repository configuration terminology; no compatibility aliases. Add SDLC TOML/Stop-hook merge ownership only. |
| Skill distribution | Existing native Skills CLI and skills-lock; source local skill activation | Pin Skills CLI 1.5.24. Preserve unrelated skills; add local activation using the existing transaction. Local files cannot redirect through links/junctions. External refresh must use reviewed immutable refs. |
| Structured SDLC validation | Existing Python source jsonschema; product Ajv/ajv-formats | Keep jsonschema's native schemas and FormatChecker with its declared providers. Ajv remains product-owned. Additional code checks only cross-record policy and freshness, which JSON Schema does not establish. |
| Skill metadata | Native OpenAI YAML format; PyYAML versus product yaml | Use safe PyYAML in the existing Python installer. Preserve unrelated metadata. No line-based YAML parser. |
| Agent execution and review roles | Native Codex configuration, custom agents, hooks and execpolicy | Configure native consumers through existing setup infrastructure. No workflow engine or duplicated security scanner. Stop evidence linkage is the source package's residual repository policy. |
| Destructive commands | Native DCG packs, diagnostics and consumer-generated schema | Select DCG 0.14.0 technically and record owner authorization. Retain inert policy/probe assets; no replacement classifier or bundled binary. |
| Security assessment | Native Codex Security plugin versus another scanner/extracted skills | Keep the complete plugin and its native artifact schemas. Do not install skills extracted from it or add an automatic credentialed scan workflow. |
| Dependency proposals | [Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file) versus [Renovate](https://docs.renovatebot.com/configuration-options/) | Owner confirmed no organization service covers this repo. Use GitHub-native Dependabot for npm, pip and Actions; no Renovate bot or custom updater. |
| Issue acceptance | GitHub Issues, Issue Forms, PR reviews and CODEOWNERS | Keep native authority. Add source label bootstrap and title/body-edit invalidation; helper validates immutable blobs and live metadata using read-only gh API requests. Labels and text fields do not establish an accountable approval. |

The imported PR reader now checks both head and base movement and follows
previous_filename for baseline immutability. Reproducing each failure preceded
its repair. These additions close concrete source gaps, not speculative framework
extension. Remaining limitations include post-check Issue/PR movement, reference
presence versus actual acceptance/research, and local evidence mutability.

## DCG owner decision

Max explicitly stated in this adoption conversation: "record my decision that I
allow its use." Record this as authorization to use DCG 0.14.0 in this repository.
The selected [upstream licence](https://github.com/Dicklesworthstone/destructive_command_guard/blob/v0.14.0/LICENSE)
contains MIT-derived terms plus an OpenAI/Anthropic rider. The owner decision is
not a claim that the upstream author granted a written exception or changed those
terms. Do not call it plain MIT or remove the rider. No binary is redistributed
with this repository. Host acceptance was unverified at this bootstrap assessment;
the [adoption record](adoption.md#command-safety) records the later operator selection
and bounded host evidence.

## Distribution and validation boundaries

The root remains private npm metadata with MIT product identity. The distributable
MCP workspace and ontology publication retain their existing licences, bundled
notices and publication controls. Development-only SDLC dependencies are not added
to its runtime bundle. Retain adapted TDD LICENSE and UPSTREAM.json, all required
dependency notices, and [.sdlc/SOURCE_PACKAGE.json](../../.sdlc/SOURCE_PACKAGE.json).

JSON Schema validates repository records; TOML and safe YAML establish parseability;
the matching Codex config schema and execpolicy consumer establish their own
contracts. GitHub itself is the supported consumer for Issue Forms, workflows,
Dependabot and CODEOWNERS. Local syntax/fixture checks do not establish remote
permissions, valid team ownership, events or required-check enforcement.
