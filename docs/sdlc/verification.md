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

## WP1 text and evidence repair, 2026-09-10

Accepted intent is [Issue 32 snapshot v1](baselines/issue-32/v1.json), merged
through baseline-only PR 34 at `4aeae598b12aa005570bfe597b820fdf6aad706a`.
Implementation follows the existing R2 route and repository-adapted TDD procedure.
The snapshot contains the D1–D10 decisions, AC-001–AC-012 and T01–T32 oracles;
it is preserved unchanged, including its exact accepted Issue body.

Actual pre-repair failures reproduced the legacy Windows launcher default,
plausible corrupted Issue text, lost evidence on console failure, stale current
success visible to a newly started check, version 2 receipt limitations, and
execution before the first recording attempt. Subsequent failure injection
exposed an atomic-writer cleanup exception masking the primary replacement error.
Those failures remain in the task evidence; they are not replaced by passing logs.

Maintained tests exercise real byte-producing children, explicit legacy/lossy
console settings, exact CRLF and Unicode normalization forms, malformed bytes with
both zero and nonzero child exits, native filesystem collisions, timeout readiness,
caught interruption, runner termination, and receipt/inventory/path rejection.
Reporting and persistence faults use controlled injection around real execution
and on-disk readback. Caught interruption is injected at an observed child-readiness
boundary; this does not claim a native Windows console-control-event test.

The first expanded regression exposed a draft fixture using an empty argv item,
which the existing configuration schema correctly rejects. The empty-output
producer now uses `--hex=`. Another draft assumed Windows `print()` emitted LF;
an explicit byte producer removes that platform-dependent assumption. Neither
correction changes the accepted exact-byte requirement.

Malformed Issue UTF-8 is rejected without creating a baseline. On this Windows
Python 3.14.7 host, native pipe-reader decoding reports `UnicodeDecodeError` on
its reader thread and leaves stdout absent; the JSON consumer rejects that absent
value. Tests retain both observations rather than assuming the exception is raised
on the caller's thread. The native text transport is unchanged apart from explicit
UTF-8/strict arguments. See the maintained [Python subprocess implementation](https://github.com/python/cpython/blob/v3.14.7/Lib/subprocess.py).

Private execution logs, original failures, receipt pairs and raw output are under
`.sdlc/runtime/verification/wp1-implementation` and `.sdlc/runtime/runs`. Shared
Python regressions passed 113 tests with one existing platform skip; the focused
launcher, PR scope and development-setup JavaScript checks passed all 73 tests.
Final R2 qualification additionally requires the current eleven-command full
profile, exact-candidate Ubuntu/Windows CI, and independent verification/review.
Their current results belong to the implementation PR and retained run records;
this narrative is not a replacement for fresh receipt validation or acceptance.

The approved run schema is installed byte-for-byte from the accepted proposal,
SHA-256 `af0ab4a271e938bece719f7502afb729f45c532797a25c2812dfcd4ed3914d28`.
Its proposal title/comment preserve provenance; the maintained consumer now uses
it. Active state stays version 2. Historical receipts and baselines are not
migrated or repaired. Keep the WP0 recovery store and original paused worktrees
until their recorded owners and consumers release them; WP1 does not release them.
