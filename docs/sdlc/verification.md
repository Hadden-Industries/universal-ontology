# Bootstrap verification evidence

Date: 2026-09-07. Target: the local uncommitted SDLC-BOOTSTRAP-01 integration
over 591ae52faafafeb6d3b4bf1b9eae4da195b0b076. These are current repository
observations, not imported package logs, independent human approval or deployment.

## Failures retained and corrected

- The existing MCP test expected required=true. The owner explicitly identified
  that expectation as wrong; it was removed. The generator continues to omit it.
- A preservation test failed because skill verification rejected an unrelated
  standalone skill. The installer now preserves unrelated activations.
- Development setup tests first exposed missing SDLC prerequisite checks and
  environment/configuration wiring; the intended contracts then passed.
- PR-reader fixtures reproduced two base-revision races and a baseline rename
  escaping its protected directory. Each failed before its focused repair.
- The first source fixture assumed POSIX sh existed on this Windows host.
  Selecting the actual host shell exposed a real PowerShell 5.1 quoting failure.
  The Windows hook now uses native path/cwd commands; its nested-directory
  rooting and argument test passes.
- Initial repository configuration publication hit sandbox write restrictions.
  The transaction preserved existing configuration; the approved command was
  subsequently run with the necessary directory access.
- Initial full product tests hit esbuild parent-directory access restrictions.
  A later direct Jest invocation exposed the test suite's requirement for npm's
  CLI context and an unfinished documentation link. Final verification uses the
  actual npm test entry point and completed documentation.
- An ambient DCG hook rejected a benign PowerShell import command's ambiguous
  subexpression syntax. Simplifying that non-destructive command was sufficient;
  no guard setting or classifier was changed. This records process friction, not
  comprehensive DCG host acceptance.
- A second ambient guard rejection treated quoted documentation inside a Python
  edit as a shell launcher. A literal patch applied the authorized text changes
  without invoking a shell or changing any guard/allowlist setting.

## Verification results

| Command or consumer | Result |
|---|---|
| npm 12.0.2: `npm test -- --runInBand` | 51 suites; 679 passed, one existing Windows skip (POSIX cache permissions). Includes fresh MCP tarball install and Person lookup. |
| `.venv/Scripts/python.exe -B -m unittest discover -s tests -p test_*.py` | 85 tests; 84 passed, one POSIX permission skip. Includes MCP setup transaction tests. |
| `.venv/Scripts/python.exe -B -m unittest discover -s tests/sdlc` | All 92 control tests passed. |
| Focused bootstrap/launcher/Issue-edit Jest tests | 30 passed; after the final formatting-only edit, the three Issue-edit tests passed again. |
| `npm run lint`, `npm run format:check`, `git diff --check` | Passed. |
| `node scripts/runRepositoryPython.js scripts/validate_ontologies.py core/universal-core.owl extended/universal-extended.owl reference-data/reference-data.owl iso-31073/iso-31073.owl iso-iec11179-3/iso-iec11179-3.owl` | All five source ontologies passed. |
| `node node_modules/vite/bin/vite.js build` | Passed; Vite 8.2.2 from the unchanged product lock; 118 modules. No prebuild auto-fixes. |
| `npm run generate:jsonld` | Zero new outputs; all 172 already existed; zero ignored errors. This is the existing missing-only command. |
| `npm run mcp:index` | Generated 159 ontology query indexes. |
| `npm run mcp:package:build` | Passed; ignored local application bundle. |
| `node scripts/runRepositoryPython.js scripts/set_up_mcp_servers.py --check` | Existing MCP documents remain current; required is omitted. |
| `node scripts/runRepositoryPython.js scripts/set_up_sdlc.py --check` | Generated SDLC Codex configuration current. |
| jsonschema against Codex 0.153.4's actual config schema | Accepted generated config. Schema SHA-256 692da7699367f6f4fbbd46c0021278c1311440bcebf0bcb9b836690c05e56196. |
| Installed Codex native `execpolicy check` on the three command strings | Issue deletion forbidden; PR merge and Issue edit prompt. No GitHub command executed. |
| Actual generated commandWindows from nested scripts directory, input `{}` and no active task | Exit 0, JSON `{}`; separate from native hook dispatch/trust. |
| `node node_modules/skills/bin/cli.mjs list --agent codex` | Native consumer lists all six local skills alongside preserved standalone skills. |
| Activation comparison and native YAML parsing | Six sources match activated files; implicit invocation false; no retained transaction artifacts. |
| Schema self-validation and GitHub YAML safe parsing | Passed; does not prove GitHub-side validation. |
| `.venv/Scripts/python.exe -m pip check` | No broken requirements. |
| Source SHA256SUMS verification | All 101 source files still match; ledger identifies 61 selected imports and adaptations. |

Product tests ran through npm 12.0.2 invoked with the task cache:
`npm exec --yes --package=npm@12.0.2 -- npm test -- --runInBand`.
The setup itself was applied through `node scripts/runRepositoryPython.js
scripts/set_up_sdlc.py`; the full development entry point was covered by fixture
tests, not rerun to replace the working environment again.

The installed SDLC Python closure is jsonschema 4.26.0, PyYAML 6.0.3,
rfc3339-validator 0.1.4, rfc3986-validator 0.1.1, attrs 26.1.0,
jsonschema-specifications 2025.9.1, referencing 0.37.0, rpds-py 2026.6.3,
and six 1.17.0. Installed licence metadata is MIT throughout this closure.
Direct pins are not a transitive hash lock. Product requirements remain separate.

Tests make Git commits and install fixture packages only in disposable directories.
The authorized local dependency installation changed this repository's node_modules
and .venv. No repository commit, push, cloud deployment or live scan was run.

## Assurance boundaries

Windows was the local host. CI's Ubuntu matrix remains unexecuted until GitHub
runs it. Unit/fixture success establishes control behavior, not actual Codex
instruction compliance, role selection or subagent behavior. No subagents were
spawned. Direct Stop-command execution is distinct from native trusted hook
dispatch. The PATH CLI is 0.149.1; target 0.153.4 installation remains separate.

GitHub token permissions, team repository grants, Issue-event delivery, CODEOWNERS
validity, Dependabot operation, required checks and private reporting settings
remain external verification. The bootstrap has no accepted prior baseline and
does not manufacture one. No quantitative SDLC benefit or production acceptance
is claimed from these checks. Further observations come from useful real work.

Task npm cache remains in ignored .agent-tools/npm-cache to support the selected
local npm consumer; remove it only when no task uses that consumer. Build outputs
are ignored product artifacts. Preserve the commands/results here and any needed
security evidence before cleanup. There is no automatic deletion hook.
