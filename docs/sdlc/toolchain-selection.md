# Selected toolchain

Checked 2026-09-07. Product identity, licensing, workspaces and publication settings
are independent of the SDLC version. Pins select a target; future updates still
require current primary-source research and exact configuration approval.

| Consumer | Selected target and source | Repository integration |
|---|---|---|
| Node.js | [24.20.0](https://nodejs.org/download/release/v24.20.0/), newest applicable LTS patch; 26 is Current | .node-version; bootstrap checks exact version. Node's distribution includes third-party notices. |
| npm | [12.0.2](https://registry.npmjs.org/npm/12.0.2), Artistic-2.0 | Existing packageManager retained. Used locally through a task npm cache; global npm was not changed. |
| CPython | [3.14.7](https://www.python.org/downloads/release/python-3147/), PSF licence and bundled notices | .python-version; reuse .venv; bootstrap checks exact version. |
| Skills CLI | [1.5.24](https://registry.npmjs.org/skills/1.5.24), MIT | Exact devDependency and native npm lock. Published LICENSE and third-party notice inspected. No global installation. |
| jsonschema | [4.26.0](https://pypi.org/project/jsonschema/4.26.0/), MIT | Keep source Python controls and Draft 2020-12 validation. |
| PyYAML | [6.0.3](https://pypi.org/project/PyYAML/6.0.3/), MIT | safe_load/safe_dump of native skill metadata. |
| RFC format providers | [rfc3339-validator 0.1.4](https://pypi.org/project/rfc3339-validator/0.1.4/) and [rfc3986-validator 0.1.1](https://pypi.org/project/rfc3986-validator/0.1.1/), MIT | Make declared date-time and URI assertions effective; no handwritten format validators. |
| Codex CLI | [0.153.4](https://github.com/openai/codex/releases/tag/rust-v0.153.4), Apache-2.0 source plus distribution notices | Selected host target; locally observed CLI 0.149.1. Repository integration does not update the host. |
| DCG | [0.14.0](https://github.com/Dicklesworthstone/destructive_command_guard/releases/tag/v0.14.0), non-standard rider | Owner authorizes use; see the rights decision below. Host installation/configuration/acceptance are separate. |
| Codex Security | Native installed plugin workflow | Plugin 0.1.23 is exposed in this desktop session. Account permissions, actual scan consumer and artifacts still require separate checks. |

The root's existing Ajv 8.20.0, ajv-formats 3.0.1, yaml 2.9.0, tar 7.5.22 and
product dependencies remain selected by the product lock. No parallel JavaScript
SDLC validator or package resolver was added.

Python direct requirements are pinned in requirements-sdlc.txt. Pip resolves their
transitive closure; it is not a hash-locked Python environment. The actual installed
closure is recorded with bootstrap evidence. Do not claim npm-style resolution
reproducibility for pip or reuse old package validation logs as repository evidence.

## Codex host update

The [official Windows CLI instructions](https://learn.chatgpt.com/docs/codex/cli)
support the owner's proposed standalone installer. An npm installation is not
necessarily managed by winget. The approved repository setup does not invoke:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

That is a separate user-level install/update with executable, cache and PATH effects.
Recheck latest stable before running, inspect its prompts and verify
`Get-Command codex -All` and `codex --version` in a fresh shell afterward.
Do not confuse the separately bundled desktop consumer with the PATH CLI.
[Native hook trust](https://learn.chatgpt.com/docs/hooks) and permissions remain
separate from writing .codex/hooks.json.
