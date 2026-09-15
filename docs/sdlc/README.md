# Repository-owned SDLC: historical records

Universal Ontology embedded its own software-development-lifecycle tooling
between 7 September 2026 (adoption, `42b6f93`) and its retirement in September
2026 under [the contributor workflow separation plan](../plans/2026-09-14-contributor-workflow-separation.md).
This directory now holds only historical records. Nothing here is an active
procedure, a setup instruction, or an input to any test, build or CI job. The
current development guide is [docs/development.md](../development.md).

## What was retired

The lifecycle scripts (`scripts/sdlc.py`, the Stop gate, state, baseline and
resource-disposition modules, `set_up_sdlc.py`, PR validation, GitHub bootstrap
and the DCG protocol probe), the `.sdlc/` sources (Codex templates, JSON schemas,
six bundled skills, pipeline policy, verification profiles and skill policies),
the SDLC control, PR-linkage and issue-acceptance workflows, the generated
`.codex/agents`, `.codex/hooks.json` and `.codex/rules`, the `sdlc`,
`setup:sdlc`, `setup:sdlc:github`, `check:sdlc` and `test:sdlc` npm entry points,
`requirements-sdlc.txt`, and the generic manuals formerly in this directory
(`howto.md`, `engineering-principles.md`, `proportional-workflow.md`,
`subagent-playbook.md`, `github-governance.md`, `temporary-artefacts.md`,
`temporary-artefacts-howto.md`, `codex-security.md`, `command-safety.md`).

All of them remain readable at the last revision before removal:
[`23e726ba965d18fa231501ee7c86ccc369d381ab`](https://github.com/Hadden-Industries/universal-ontology/tree/23e726ba965d18fa231501ee7c86ccc369d381ab).
Relative links inside the retained records below were written against that
tree and may no longer resolve in the current checkout; read them at that
revision. The retained records were not rewritten.

## Archived adoption manifests

| Archive file | Original location | Bytes |
| --- | --- | --- |
| [archive/PACKAGE_STATUS.json](archive/PACKAGE_STATUS.json) | `.sdlc/PACKAGE_STATUS.json` | identical to the original at `23e726b`; SHA-256 `febd2a926dc2b9b56d8f83d68573637444d7899096e80b060f2413581afff395` |
| [archive/SOURCE_PACKAGE.json](archive/SOURCE_PACKAGE.json) | `.sdlc/SOURCE_PACKAGE.json` | identical to the original at `23e726b`; SHA-256 `8f6b8f02158eb6a264a05188b2f15d32352576505e18c2fed94b5455a6aa4e4b` |

Their `version`, `status`, `deployed` and path statements describe the historical
deployment of the source package at the time they were written. They are not a
current activation and not a release.

## Retained records

| Record | What it is |
| --- | --- |
| [adoption.md](adoption.md) | Operational adoption record: accepted host scope, evidence and upstream limitations, with its retirement notice. |
| [SDLC-BOOTSTRAP-01.md](SDLC-BOOTSTRAP-01.md) | The original integration approval (7 September 2026). |
| [verification.md](verification.md) | Bootstrap verification evidence and retained failures. |
| [dcg-acceptance.md](dcg-acceptance.md) | The command-protection deployment acceptance template. The installed native guard and the operator's own configuration are separate from this repository and were not changed by the retirement. |
| [sources.md](sources.md), [software-selection.md](software-selection.md), [toolchain-selection.md](toolchain-selection.md), [package-reuse-assessment.md](package-reuse-assessment.md) | Research and selection records behind the adoption. |
| [baselines/](baselines/) | Accepted Issue baselines (`issue-25` … `issue-42`) as captured; their bytes are unchanged. |

Related historical planning material lives under
[docs/plans/sdlc-improvements/](../plans/sdlc-improvements/README.md) and in the
accepted plans and reviews under `docs/plans/` and `docs/reviews/`.

## What was kept

The ontology validator, the SHACL editing policy, the publication gate and its
receipt location (`.sdlc/runtime/policy-reports`, ignored by Git), the external
Agent Skills installer (`npm run setup:skills`), the MCP installer
(`npm run setup:mcp`), the Git pre-commit hook, and the development setup
command. `.sdlc/runtime` and `.sdlc/tmp` remain ignored local evidence and
scratch; their contents were not part of the retirement.
