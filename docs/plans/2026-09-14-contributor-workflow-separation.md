# Universal Ontology contributor workflow separation implementation plan

Status: proposed, 14 September 2026. This document records a design assessment and a proposed migration. It does not change repository policy, approve its own implementation, install HISEW, or authorize GitHub writes or deletion of retained evidence.

**Goal:** Allow contributors to develop and submit acceptable Universal Ontology changes using their chosen tools and methods, while maintainers may use Hadden Industries Software Engineering Workflow (HISEW) in personal mode without maintaining a second workflow implementation in this repository.

**Architecture:** Universal Ontology owns its domain requirements, product validators, tests, build commands, publication safeguards and public contribution contract. GitHub owns hosted execution and merge enforcement. HISEW owns an opting-in maintainer's workflow execution, personal configuration and workflow evidence outside the repository. Host permissions and native command protection remain separate controls.

**Technical basis:** Existing npm scripts, the repository `.venv`, Git, GitHub Actions and rulesets, RDFLib/pySHACL/Jena, and HISEW's existing personal registration and verification interfaces. No new framework, plugin wrapper, scanner, dependency family or compatibility shim is selected.

**Spec and authority:** The user requested contributor-friendly acceptance through CI and review, explicitly excluded functionality duplicating HISEW personal mode, and requested this researched implementation plan. Those outcomes are the design brief. The exact source, configuration and remote changes below are proposals requiring acceptance before execution.

**Implementation procedure:** Use the repository-adapted implementation procedure and the accepted migration transition described below. This plan follows the repository's thin-planning format: observable slices, exact proposed scope and falsifiable evidence. It does not impose an additional implementation orchestrator, delegation requirement or per-contribution planning ceremony.

## 1. Assessment of the responsibility split

The proposed split is appropriate, provided that product-specific validation and publication safeguards remain repository-owned, and personal workflow receipts never become a prerequisite for public contribution. This is an architectural conclusion drawn from the sources and inspected implementation; no external standard mandates HISEW or this particular arrangement.

### Authoritative basis

Sources were checked on 14 September 2026. Recommendations are distinguished from formal specifications and actual platform behavior.

| Source and status | Relevant guidance or contract | Decision for this migration |
| --- | --- | --- |
| [GitHub: Building Welcoming Communities](https://opensource.guide/building-community/) — maintainer guidance | Reduce contributor friction and explain how to get started; occasional contributors cannot be expected to learn an entire internal process. | Short public instructions, small PR template, useful issue forms, optional local tooling and maintainer assistance with verification gaps. |
| [NIST SP 800-218, SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) — final security recommendations | High-level secure-development practices can be integrated into different SDLC implementations. | Retain security outcomes and ownership without prescribing contributors' work sequence. No NIST compliance claim is made. |
| [OpenSSF: Concise Guide for Developing More Secure Software](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software.html) — security guidance | Automated positive/negative tests, review, dependency assessment and vulnerability monitoring support secure development. | Preserve product tests, scans, dependency management and vulnerability handling. Tools supplement accountable review. |
| [GitHub: Required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) — platform contract | Workflow-level skips can leave required checks pending; conditionally skipped jobs may count as successful. Checks are tied to applicable commit/event identities. | Stable terminal gate jobs evaluate the results of all applicable prerequisite jobs. Do not infer complete acceptance from one early successful job. |
| [GitHub: Workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [secure use](https://docs.github.com/en/actions/reference/security/secure-use) — platform/security guidance | Fork PRs have restricted token/secrets access; privileged events must not execute untrusted candidate code. Immutable action references reduce supply-chain exposure. | Execute contributions on `pull_request`; preserve restricted permissions and pinned actions. Remove obsolete privileged metadata automation. |
| [GitHub: Code-scanning permission errors](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/resource-not-accessible) — platform guidance | Code-scanning upload behavior on `pull_request` supports the untrusted Dependabot contribution path. | Exercise the supported PR scanning path instead of skipping all fork contributions or introducing privileged candidate execution. |
| [W3C SHACL Recommendation](https://www.w3.org/TR/2017/REC-shacl-20170720/) — normative specification | A processor evaluates a data graph against a shapes graph and produces validation results. | Keep the shapes, graph selection, supported processor and report interpretation in Universal Ontology. A workflow engine must not duplicate those rules. |
| [W3C OWL 2 structural specification](https://www.w3.org/TR/owl2-syntax/#Ontology_IRI_and_Version_IRI) — normative specification/conventions | Ontology and version IRIs identify ontology versions; imports and version accessibility have defined semantics. | Preserve ontology identities, import behavior and publication contracts throughout the migration. |
| [W3C Data on the Web Best Practices](https://www.w3.org/TR/dwbp/) — Recommendation | Provenance, persistent identifiers, version history, vocabulary reuse and consumer feedback are data-publishing responsibilities. | Retain source attribution, semantic review, compatibility decisions and identifiable releases as product concerns. |
| [Python 3.14 `site`](https://docs.python.org/3.14/library/site.html) — runtime specification | `.pth` files can extend import paths and execute import statements during startup. | Treat HISEW's environment-qualification limitation as a real integration question; do not delete such files or evade qualification through a different launcher. |

Version discipline matters here. [SSDF 1.2](https://csrc.nist.gov/pubs/sp/800/218/r1/ipd) is an initial public draft, and [SHACL 1.2 Core](https://www.w3.org/TR/2026/WD-shacl12-core-20260828/) is a Working Draft. This migration does not adopt either draft or upgrade the product's ontology dialect or engines. Existing selected versions are retained unless a separate, concrete compatibility issue requires an approved change.

### Responsibility contract

| Object or decision | Owner | Interface used by others | Excluded duplication |
| --- | --- | --- | --- |
| Contribution expectations and acceptance policy | Universal Ontology maintainers | `CONTRIBUTING.md`, `REVIEW.md`, issue/PR conversation | HISEW risk codes, private receipts or mandatory development method in the public contract |
| Ontology meaning, sources, IRIs, activation and compatibility | Universal Ontology domain maintainers | `policy/`, generated editing policy, source references, review | A generic workflow policy redefining ontology acceptability |
| Product verification | Universal Ontology | Existing commands and their exit codes/reports | A second validator inside HISEW or a repository wrapper around HISEW |
| Qualification of bytes immediately before publication | Universal Ontology publication code | Product-owned qualification receipt and publication gate | Replacing the product receipt with a generic HISEW success receipt |
| Hosted tests and merge conditions | GitHub plus repository maintainers | Actions checks, ruleset, normal reviews | Personal workflow state as a required check or PR-body contract |
| Task routing, planning method, execution ownership, workflow verification and handoff | HISEW for opting-in users | Installed plugin and external project registration | Repository copies of its engine, schemas, skills or lifecycle state |
| Workflow retention and recovery | HISEW and the evidence owner | External storage and supported HISEW operations | An ongoing `.sdlc/runtime` workflow database in Universal Ontology |
| Sandbox, permissions, native trust and destructive-command protection | Host/user and native protection providers | Their supported configuration and native dispatch | Treating SessionStart/Stop as a permission system or a substitute for DCG |
| Optional external skill refresh and MCP setup | Existing independently maintained tooling | Explicit opt-in commands | Automatic installation as a requirement of development setup |

Running the same product command through CI and HISEW is intentional reuse. Their evidence serves different consumers: GitHub determines merge eligibility; HISEW manages the user's local execution. The rule defining product success remains in the product command and tests.

## 2. Inspected state and limits

### Source identities

- Universal Ontology: `C:/Users/maksy/GitHub/universal-ontology`, `main`, `1802ab1b39eda578da694f17979c393db70cc9c6`. The working tree was clean before this plan. GitHub's `main` matched this revision.
- HISEW: `C:/Users/maksy/GitHub/software-engineering-workflow`, initially `4c28d3cd9fa57d21172e6fe40fdb11f86ecd85e2`, refreshed to `cc202736d4444fb5647336b82f0e01c029ba843c` during final review. Both inspections found a clean working tree. The intervening task-lock/qualification correction and rebuilt bundles do not change the inspected personal-mode, setup or Python-environment contracts. Installed-artifact qualification remains a separate check.
- Native Git listed the Universal Ontology main checkout and the separate `dependabot-67-validation` worktree. No worktree removal is proposed.
- No `.sdlc/runtime/active.json` existed in the main checkout when inspected. Several retained runtime/evidence directories do exist. This does not establish that all other worktrees or external consumers are idle.
- HISEW's current [product scope](../../../software-engineering-workflow/docs/product-scope.md) excludes source cutover from its existing implementation authorization. This plan therefore supplies a separate proposed UO migration scope.

### Findings that affect implementation

1. **Embedded workflow duplication is real.** UO contains the lifecycle scripts, `.sdlc` schemas and skills, generated `.codex` agent settings and Stop hook, baseline validation, issue-state automation and SDLC-specific tests. HISEW already owns corresponding personal workflow capabilities in its source and packages.
2. **Development setup has workflow side effects.** `scripts/setUpDevelopmentEnvironment.js` invokes `scripts/set_up_sdlc.py` after dependency installation. It also requires `requirements-sdlc.txt`. Removing only contribution-guide wording would leave the installation dependency intact.
3. **The skill installer has mixed responsibilities.** At the inspected HEAD, `setup:skills` refreshes external declarations and activates bundled SDLC skills. Today's merged floating-reference behavior belongs to independent work and must survive. Remove only the bundled SDLC discovery, activation and policy coupling.
4. **Product reports currently live under the workflow directory.** `scripts/ontology_policy/reports.py` sets `REPORT_DIRECTORY` to `.sdlc/runtime/policy-reports`. `publication.py` consumes the same directory before `upload_to_s3.py` uploads. These product safeguards remain, with a product-owned output location.
5. **The SDLC workflow contains product tests.** `.github/workflows/sdlc-control-tests.yml` exercises the installed ontology runner, development setup, the Python launcher, optional MCP/skill setup and check selection. Preserve those tests in product/development CI before deleting the workflow.
6. **Current merge enforcement is narrower than the workflow inventory.** [Ruleset 22485773](https://github.com/Hadden-Industries/universal-ontology/rules/22485773), read live, is active on `refs/heads/main` and requires only `OWL Differential Analysis`, from integration `15368`. It also requires a PR and prevents deletion/non-fast-forward updates. Required approval count is zero; code-owner review and strict status freshness are disabled; there are no listed bypass actors. The ruleset does not currently require SDLC linkage, complete ontology qualification, MCP distribution, or CodeQL completion.
7. **An early ontology check does not cover its successors.** `policy-qa` and the Windows/Linux `qualify` matrix depend on the required `validate-ontologies` job. Requiring only the latter does not require those downstream jobs to succeed.
8. **CodeQL omits fork PRs.** Its scope job has a same-repository condition, and the workflow has top-level Markdown/OWL path exclusions. Both need attention before its terminal result becomes a required check.
9. **Agent configuration is mixed.** `.codex/config.toml` contains SDLC-managed agent settings, host permission settings, and independently managed MCP blocks. Removing the whole directory would discard unrelated settings.
10. **HISEW adoption has a concrete environment gap.** UO's Python 3.14.7 `.venv` disables system site packages but contains `Lib/site-packages/distutils-precedence.pth`. HISEW's `python_environment_inventory()` in `verification_commands.py` rejects any `.pth` or `.egg-link` file. This is a static incompatibility with the current Python-environment verification route, not a completed installed-plugin test.

The GitHub CLI read returned HTTP 401. The connector successfully read the ruleset and branch metadata, but the administrative branch-protection endpoint returned HTTP 403. Additional host/organization settings and effective administrative policy must be read by an authorized operator before remote changes. A failed read is not evidence that a control is absent.

No setup, dependency installation, product tests, live scan, plugin lifecycle, publishing operation or remote mutation was performed for this planning assessment.

## 3. Selected design and alternatives

**DEC-01 — Select HISEW personal mode.** UO will contain no HISEW dependency, `.engineering-workflow` policy, HISEW action, local registration, generic lifecycle wrapper or required HISEW PR metadata. Personal configuration and evidence remain outside the checkout and Git administrative directories. This follows the existing HISEW product contract rather than creating an integration layer.

**DEC-02 — Keep acceptance public and product-owned.** Contributors explain the problem, change and relevant checks; ontology changes additionally explain sources and semantic impact. Maintainers can request additional evidence for a concrete risk and can help produce it. Choice of editor, assistant, test-writing order and workflow tool does not affect submission eligibility.

**DEC-03 — Retain domain safety.** Preserve `policy/`, all ontology rules and activation records, the generated editing policy, publication checks, existing import/query/projection contracts and independent fixtures. The publication receipt stays a product artifact; its default location becomes `reports/ontology-policy/`. Existing `--report-directory` behavior remains supported. Do not add an automatic search of the old `.sdlc` location.

**DEC-04 — Use native GitHub enforcement.** Add stable terminal gate jobs to the existing product workflows and a development workflow. Each consumes only its own workflow's native `needs` results and applicability outputs. There is no cross-workflow polling service, bespoke required-check registry or HISEW metadata service.

**DEC-05 — Preserve independent tooling.** Keep `setup:skills`, `setup:mcp`, their native consumers and unrelated configuration. Their execution remains optional. A product pre-commit hook may remain as an optional convenience because it invokes the same ontology validator; local hook execution is not an acceptance prerequisite.

**DEC-06 — Perform a controlled retirement.** Remove active workflow implementation, preserve historical evidence and accepted product baselines, and retire generic manuals from the current contributor path. No source rewrite, automatic state conversion, mass label cleanup or recursive deletion of `.sdlc` is part of the design.

Alternatives considered:

| Alternative | Assessment |
| --- | --- |
| Keep the embedded SDLC and make it optional | Retains a second engine, skill set and maintenance obligation; fails the user's explicit ownership requirement. |
| Replace it with HISEW repository-policy mode and the optional GitHub linkage action | Reuses the engine but retains the public risk/baseline metadata burden. HISEW's integration contract explicitly preserves those fields. Wrong adoption mode for this objective. |
| Remove every SDLC-named artifact indiscriminately | Loses product reports, tests, independent tooling and retained evidence. File location is insufficient to determine responsibility. |
| Require only green CI, with no semantic review | Automated conformance does not settle definitions, source interpretation, intended compatibility or whether changed tests are adequate. |
| Selected: product commands and GitHub acceptance, with optional external personal workflow | Gives each responsibility one implementation owner and preserves contributor autonomy. |

The residual custom work is limited to uncoupling existing setup/report paths, maintaining product-check selection and adding native gate conditions. There is no need to research or select another workflow platform. Existing runtime and dependency versions remain the baseline: Node 24.21.0, npm 12.0.2, Python 3.14.7, JDK 25.0.4.1, pySHACL 0.40.1 and Jena 6.2.0. No HISEW source or license is copied into this MIT product. Existing notices remain intact.

## 4. Requirements and acceptance criteria

These identifiers organize this one migration; contributors will not be required to use them.

| Requirement | Acceptance criterion and meaningful counterexample |
| --- | --- |
| REQ-01: Contribute without HISEW | AC-01: A fresh checkout can install product dependencies and run its documented checks on Windows and Linux with no plugin, workflow registry, `.sdlc`, or agent skills present. A checkout that requires a lifecycle initialization step fails. |
| REQ-02: One workflow implementation | AC-02: Active UO source, tests, setup and CI contain no generic SDLC engine or HISEW integration. AC-03: Using HISEW creates no workflow-specific repository files; only outputs of invoked product commands are permitted. |
| REQ-03: Preserve ontology and publication behavior | AC-04: Existing source/shape/activation bytes and golden expectations remain unchanged. AC-05: Changed sources, policy, authority snapshot, lock or built artifact still invalidate publication qualification; an old workflow receipt cannot qualify publication. |
| REQ-04: Enforce applicable hosted checks | AC-06: All selected jobs must succeed for their terminal gate to succeed. Failed, cancelled, missing or unexpectedly skipped selected jobs cannot produce a passing gate. AC-07: Fork, Dependabot and same-repository PRs have the intended checks under safe event permissions. |
| REQ-05: Remove procedural submission barriers | AC-08: Ordinary PRs and issue reports need no risk class, accepted-baseline identifiers, software-selection dossier, cleanup ledger, particular test method or tool installation. CI and normal review accept a concise truthful submission. |
| REQ-06: Preserve unrelated work and controls | AC-09: External skill refresh, native lock updates, optional MCP setup, permission settings and independent user-owned agent data remain functional and unchanged except for approved SDLC-specific removals. |
| REQ-07: Preserve and resolve migration state | AC-10: Every retired active control has an identified successor or explicit retirement decision. Retained evidence remains readable with its original identity; no historical result is relabelled as current. |
| REQ-08: Honest HISEW readiness | AC-11: The selected installed HISEW artifact can observe and run the actual UO commands under its accepted environment contract. The `.pth` incompatibility is resolved by the HISEW owner or remains an explicit adoption blocker. AC-12: One selected host demonstrates personal registration, execution, verification and handoff; claims about native hooks require observed host dispatch. |

Quality scenarios:

- **QA-01, contributor usability:** A first-time contributor changes a documentation sentence and opens a normal PR. The template is understandable without internal terminology, irrelevant expensive jobs are avoided, and required gate checks still terminate.
- **QA-02, regression containment:** An implementation fixture causes an ontology violation or a product test failure. The owning check and terminal gate fail even if unrelated jobs succeed.
- **QA-03, isolation:** A fork PR includes hostile text in its description and changes a candidate build script. It receives neither publication credentials nor privileged metadata execution; no workflow interpolates PR text as shell code.
- **QA-04, recovery:** The cutover is interrupted after source edits but before remote enforcement changes. Existing records remain readable, the operator can identify which stage completed, and no partial transition is described as adopted.
- **QA-05, change locality:** A subsequent HISEW upgrade requires no UO source patch; a UO validation change is implemented once in product code and used by both callers.

## 5. Implementation slices

Risk assessment for this migration: R2 is justified by removal of active controls, CI trust boundaries, publication-report relocation and retained state. This classification describes the maintainer migration only. It does not become a public contribution requirement.

Max is the decision owner. The implementing maintainer owns the integrated UO candidate, a GitHub administrator owns remote policy changes, and the HISEW owner owns plugin readiness. No parallel writes are assumed. Slices may be verified separately; coupled source removals and configuration changes should land as a coordinated candidate, not as temporarily broken main-branch states.

### SLICE-000 — Confirm migration authority, consumers and preservation

**Files/resources:** This plan; existing `.sdlc/runtime/` records; the native worktree inventory; `.codex` configuration; external HISEW installation/registry paths discovered through supported inspection; GitHub ruleset 22485773.

**Consumes:** The user's accepted outcomes and the inspected identities above.

**Produces:** An accepted exact scope, a selected execution owner and a short current-state/preservation record in the existing task or approved external evidence store.

- [ ] Refresh Git status, HEAD, worktree ownership, live rules and current HISEW source/artifact identities. Account for the `dependabot-67-validation` worktree without modifying it.
- [ ] Inspect actual active/paused tasks and retained-resource consumers. Record which ongoing HISEW work still reads UO's old method. Require a consumer handoff before deleting a method file it still needs.
- [ ] Preserve applicable source history, uncommitted/index contents if present, ignored evidence, relevant configuration and reconstruction instructions. Verify readback from storage outside any resource being retired. A Git commit or digest alone does not preserve ignored evidence.
- [ ] Accept the exact configuration changes in section 7 and a one-time transition rule: after retiring the embedded engine, final migration evidence comes from the retained product commands, hosted gates and review. The removed `check:sdlc`/`test:sdlc` checks are retired obligations, not fabricated passes.
- [ ] Select exactly one workflow owner for the migration execution. Close or hand off any previous execution with its supported procedure before replacing its hooks/state. Do not manually clear active records or run both Stop gates.

**Proof:** Current source identities, explicit scope/transition decision, actual consumer readback and retained-evidence verification. Preserve any unknown ownership as a hold on that resource; independent source planning or test preparation can continue.

**Release/recovery:** No deletion or remote change in this slice. Historical product baselines retain their bytes and paths.

### SLICE-001 — Separate product reporting from workflow state

**Modify:** `scripts/ontology_policy/reports.py`, `scripts/validate_ontologies.py`, `.gitignore`, `tests/test_ontology_policy_cli.py`, `tests/test_publication_gate.py`, `tests/distribution/universal-ontology-mcp-distribution-workflow.test.js`.

**Inspect/retain:** `scripts/ontology_policy/cli.py`, `scripts/ontology_policy/publication.py`, `scripts/upload_to_s3.py`, `policy/`, `docs/policy/Editing-Policy.generated.md`.

**Consumes:** Existing report and qualification contracts.

**Produces:** Product output at `reports/ontology-policy/`, with unchanged validation, receipt schema and publication refusal conditions.

- [ ] Add behavior tests covering the real default report writer and publication consumer with no `.sdlc` directory present. Keep an explicit-directory test for `--report-directory`.
- [ ] Change the shared `REPORT_DIRECTORY` constant to `REPOSITORY_ROOT / "reports" / "ontology-policy"`; keep `RECEIPT_FILENAME` and receipt semantics unchanged. Check that both the writer and publication consumer use this shared definition.
- [ ] Add `/reports/` to `.gitignore`. Keep the legacy runtime ignore and Jest exclusion while pre-existing evidence remains there; their retention prevents accidental publication or test discovery and does not retain an engine.
- [ ] Move the distribution metadata test's temporary fixture from `.sdlc/runtime` to an owned system temporary directory, using its existing cleanup pattern. Do not put captured source copies under Jest discovery.
- [ ] Remove the validator docstring's claim that SDLC profiles are an owning integration. Document its ordinary CLI/CI/pre-commit consumers.
- [ ] Requalify product artifacts into the new directory when publication is actually needed. Retain previous receipts as historical; do not copy one into the new current-receipt position.

**Proof:** The following counterexamples continue to refuse publication: missing receipt, diagnostic-purpose receipt, changed policy, changed authority snapshot, changed dependency lock, incomplete module set, changed source and mismatched generated bytes. An ordinary validation run writes product reports without creating `.sdlc`.

**Focused commands:** Use the existing repository launcher for selected unittest modules:

```sh
node scripts/runRepositoryPython.js -B -m unittest tests.test_ontology_policy_cli tests.test_publication_gate -v
npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-distribution-workflow.test.js
```

**Recovery:** Restore only this slice's source changes through an authorized corrective commit if needed; preserve both generations of report output. Never reinterpret a previous receipt as a new qualification.

### SLICE-002 — Make product setup and checks independently usable

**Modify:** `scripts/setUpDevelopmentEnvironment.js`, `scripts/set_up_agent_skills.py`, `tests/set-up-development-environment.test.js`, `tests/test_set_up_agent_skills.py`, `package.json`, `requirements.lock.txt`.

**Create:** `requirements-dev.txt`.

**Retire after all consumers are updated:** `requirements-sdlc.txt`.

**Retain:** `requirements.txt`, `package-lock.json`, `skills-lock.json`, `scripts/runRepositoryPython.js`, `scripts/set_up_mcp_servers.py`, `scripts/_commands.py`, `scripts/_repository.py`, `.githooks/pre-commit`, `scripts/configureGitHooks.js` and their independent tests.

- [ ] Add setup tests asserting that normal development setup installs the locked dependencies but never invokes SDLC setup, skill refresh, MCP installation, plugin installation, hook trust or a publication command.
- [ ] Remove the `set_up_sdlc.py` invocation and replace the setup input requirement for `requirements-sdlc.txt` with `requirements-dev.txt`.
- [ ] Preserve the current lock integrity and unusable-environment diagnostics. An existing environment with removed dependencies may need an explicit operator decision; do not automatically delete or uninstall from the user's `.venv`.
- [ ] Keep deployment prerequisites in deployment documentation. Remove the AWS CLI probe/warning from ordinary product dependency setup; setup must not suggest AWS is needed to contribute.
- [ ] Retain `PyYAML==6.0.3` for the optional skill tool's metadata consumer and `pip-tools==7.6.1` for maintaining the hash lock in `requirements-dev.txt`. Remove the retired engine's direct `jsonschema`, `rfc3339-validator` and `rfc3986-validator` requirements only after confirming the remaining dependency closure. Let the native resolver decide whether any remains transitively needed.
- [ ] Regenerate `requirements.lock.txt` with the existing pip-tools route and the two new owning input files. Preserve retained package versions and hashes unless the resolver produces a separately reviewed necessary difference. Do not perform a dependency upgrade during this cleanup.
- [ ] Remove only the installer's `.sdlc/skills` discovery/activation, `.sdlc/skill-policies.json` policy application, local-only CLI path and corresponding callers. Preserve native external refresh, floating refs, source validation, unrelated-skill preservation and existing external metadata behavior. Do not reset `skills-lock.json`.
- [ ] Add `build:check` to `package.json` with `node node_modules/vite/bin/vite.js build`. Keep the existing `build`/`prebuild` behavior unchanged; document the non-fixing check command for CI and contributors.
- [ ] Remove the obsolete npm entry points `setup:sdlc`, `setup:sdlc:github`, `sdlc`, `check:sdlc` and `test:sdlc` in coordination with SLICE-005. Keep `setup:skills` and `setup:mcp` explicitly optional.

Native lock command, executed only in the implementation's authorized `.venv`:

```sh
node scripts/runRepositoryPython.js -m piptools compile --allow-unsafe --generate-hashes --no-strip-extras --output-file=requirements.lock.txt requirements.txt requirements-dev.txt
```

**Proof:** A fresh Windows/Linux checkout completes `npm run setup:development` with no workflow/agent prerequisites, produces no workflow configuration and preserves tracked input files. Faults in npm installation, hash installation or pip consistency still fail. External skill refresh tests retain today's floating-branch behavior. Existing MCP setup and Python launcher tests remain covered.

**Focused commands:**

```sh
npm test -- --runInBand --runTestsByPath tests/set-up-development-environment.test.js tests/run-repository-python.test.js tests/configure-git-hooks.test.js
node scripts/runRepositoryPython.js -B -m unittest tests.test_set_up_agent_skills tests.test_set_up_mcp_servers -v
```

Tests using a disposable external-skill Git fixture exercise that fixture, not an actual refresh of the user's installed skills.

### SLICE-003 — Establish complete, fork-compatible product CI

**Modify:** `scripts/selectPullRequestChecks.js`, `tests/pr-check-scopes.test.js`, `.github/workflows/ontology-validation.yml`, `.github/workflows/verify-universal-ontology-mcp-distribution.yml`, `.github/workflows/codeql.yml`, `tests/distribution/universal-ontology-mcp-distribution-workflow.test.js`.

**Create:** `.github/workflows/development-checks.yml`, `tests/development-workflow.test.js`.

**Retire after replacement coverage exists:** `.github/workflows/sdlc-control-tests.yml`.

**Consumes:** Product commands and setup from SLICE-002, existing native Git diff selection and YAML parsing.

**Produces:** Four stable terminal check contexts, using existing workflow jobs and one replacement development workflow.

| Terminal context | Native dependencies | Required-success rule |
| --- | --- | --- |
| `Ontology checks` | `validate-ontologies`, `policy-qa`, `qualify` | Differential selection/validation must succeed; selected QA and every selected qualification matrix member must succeed. |
| `Product checks` | `scope`, `validate`, `archive`, `container`, `assemble` | Scope must succeed; all jobs selected by product/MCP/build/docs applicability must succeed. |
| `Development checks` | New `scope` and Windows/Linux `development` matrix | Scope must succeed; selected setup and development test jobs must succeed on both platforms. |
| `CodeQL checks` | `scope`, `analyze` | Scope must succeed; every selected language analysis must succeed; an empty valid language selection is explicitly not applicable. |

- [ ] Replace the generic `sdlc` selection category with `development` for the retained setup, optional-tool and launcher responsibilities. Include dependency manifests/locks, runtime files, relevant Python/JavaScript setup scripts, their tests, hook files, the new workflow and the selector itself. Preserve existing product, ontology and MCP categories.
- [ ] Run workflows carrying required contexts on every applicable PR event. Use job-level selection for expensive work. Remove the CodeQL same-repository restriction and workflow-level `paths-ignore` exclusions; preserve the language-aware selector.
- [ ] Implement terminal jobs with `if: always()` and explicit `needs`. Use native result/applicability conditions; a small failing assertion step is sufficient. Do not introduce an engine or query other workflows' results.
- [ ] Treat unsuccessful selection, invalid/missing applicability output, selected-but-skipped work, cancellation and failure as non-passing. Accept a skipped job only when its valid scope explicitly says it is not applicable. Never use `continue-on-error` to make a required result pass.
- [ ] Move the retained development/bootstrap/validator tests out of SDLC CI. Run `npm run setup:development` and `npm run test:python` on Windows/Linux for selected development changes, plus the focused JavaScript setup/launcher/selector tests. Existing ontology qualification continues to own provisioned Jena parity and the complete active-set run.
- [ ] Before the required Jena suite, call its native `JenaRuntime.from_environment()` check as a hard prerequisite so an unavailable engine cannot silently become a successful skipped suite. Preserve the current JDK/Jena provisioning and artifact verification.
- [ ] Keep existing pinned actions, `persist-credentials: false`, minimal job permissions and publication isolation. Do not add write tokens or secrets to fork build jobs. CodeQL's code-scanning permissions remain confined to its supported scanning job.
- [ ] Keep CodeQL findings distinct from successful scan execution. The terminal gate proves analysis completion; maintainers still disposition findings under the security policy, and any existing native code-scanning merge policy must be preserved.
- [ ] Expand selector tests for docs-only changes, ontology/shape changes, runtime/lock changes, development-tool changes and the four workflows themselves. Retain real Git fixtures, rename/deletion handling, large diffs, exact revision checks and native diff-error tests.
- [ ] Test the terminal truth table: valid not-applicable, all selected succeeded, selector failure, malformed output, selected job failure, selected job cancellation and unexpected skip. Parse the real YAML through the existing `yaml` consumer; supplement local tests with actual GitHub event runs.

No merge queue was observed in the inspected ruleset. Do not introduce one. If a queue is enabled before execution, revise the selector/event contract to support GitHub's `merge_group` event before making these gates required.

**Proof:** A docs-only PR terminates without expensive unrelated work; an ontology, code or setup failure blocks its terminal gate; a fork and Dependabot PR get applicable checks without privileged execution. Workflow-dispatch success alone does not qualify a required PR check.

**Focused commands:**

```sh
npm test -- --runInBand --runTestsByPath tests/pr-check-scopes.test.js tests/development-workflow.test.js tests/distribution/universal-ontology-mcp-distribution-workflow.test.js
```

Actual GitHub test PRs, reruns or intentionally failing branches require the corresponding publishing authorization at execution time. They are not created by this plan.

### SLICE-004 — Replace the public process contract

**Modify:** `CONTRIBUTING.md`, `README.md`, `REVIEW.md`, `AGENTS.md`, `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/change.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/CODEOWNERS`, `docs/README.md`, `docs/mcp/local-development.md`.

**Create:** `docs/development.md`, `docs/policy/README.md`.

- [ ] Rewrite contribution guidance around what is submitted and reviewed. Small fixes can start as a PR; substantial semantic, architectural or compatibility changes should be discussed early to avoid wasted effort. No prior permission is needed merely to propose a configuration/dependency change in a fork.
- [ ] Put setup commands, their effects, optional integrations and relevant verification commands in `docs/development.md`. Explain that a contributor can submit with an honest verification gap and ask for help; the project still requires sufficient evidence before acceptance.
- [ ] Use `docs/policy/README.md` to point to the existing owning graphs, generated editing policy, sources and publication behavior. Do not copy the rules into a second prose policy or alter accepted SHACL requirements.
- [ ] Replace the PR template with the four sections shown below. Remove mandatory metadata lines, internal principle attestations, workflow/security-provider dossiers and cleanup declarations.
- [ ] Simplify bug reporting to observed/expected behavior and reproduction; environment/evidence/impact fields may be supplied when relevant. Simplify change proposals to the problem, proposed result and optional semantic/compatibility concerns. Remove SDLC labels, route choices, required research fields and attestations. Enable blank issues while preserving private security and conduct-report links.
- [ ] Rewrite `REVIEW.md` as concise product review guidance: correctness, domain meaning/provenance, affected consumers, meaningful tests and material security/compatibility effects. Reviewers must distinguish an actionable defect from a preference. Do not mandate HISEW, a particular scanner/reviewer product, generic principle codes or evidence from contributors' machines.
- [ ] Remove `AGENTS.md`'s embedded SDLC procedure and mandatory commit-skill selection. Retain local workspace preservation, explicit commit/push authority, Python-environment instructions and configuration safety. Explicitly scope those permissions to agents operating in the owner's workspace; they do not restrict a public contributor's ability to submit a proposal.
- [ ] Replace active SDLC links in README, security guidance and MCP development instructions. Keep the existing vulnerability-reporting channels, licence, Code of Conduct and privacy commitments.
- [ ] Remove CODEOWNERS entries for retired paths; preserve actual ownership of surviving configuration, scripts and security material. Do not invent a new team or claim that a CODEOWNERS entry grants access or enables required reviews.

Proposed PR template:

```markdown
## Problem

What problem does this address? Link an issue if useful.

## Change

What changes for users or consumers?

## Verification

What did you check? Mention anything you could not run or need help with.

## Semantic or compatibility impact

For ontology changes, explain the meaning and sources. Note affected identifiers,
interfaces or migrations when relevant. Omit this section when it does not apply.
```

**Proof:** Walk through the docs-only, ordinary bug-fix and source-backed ontology-change journeys. None requires a plugin, risk label, baseline or paid tool. Follow every active local link. Review the proposal as a first-time contributor; do not manufacture unit tests for ordinary prose.

### SLICE-005 — Retire the embedded engine and adopt the personal workflow

**Retire:** The exact active-engine files in section 7. Preserve independent setup/tooling and product checks identified above.

**Modify:** `.codex/config.toml` only at the scoped managed sections; optional-skill activation locations only after a local ownership comparison; the historical index described below.

**External dependency:** HISEW readiness, owned by the HISEW task. UO source preparation does not need an installed plugin. Complete maintainer personal-mode adoption only when its actual environment route is qualified.

- [ ] Have the HISEW owner resolve or explicitly retain the current `.pth` environment restriction. The relevant existing HISEW files are `python/src/hadden_industries_software_engineering_workflow/verification_commands.py`, `python/tests/test_verification_commands.py`, `docs/engine-commands.md` and the packaging/qualification evidence for the selected artifact. Any change there belongs to a separately accepted HISEW design and its native tests, not a workaround added to UO.
- [ ] Require a HISEW-owned acceptance example using a fresh UO hash-locked environment. It must account for the installed startup/import configuration and correctly invalidate environment evidence when those inputs change. An injected external `.pth`/editable path must either be covered by the accepted model or refused with an honest diagnostic. Do not claim that a static file inventory proves arbitrary startup code safe.
- [ ] Inspect the actual installed plugin and selected engine through HISEW's native readiness/setup path. Use `personal`, as already selected by the user. Do not choose `repository-policy`, install the optional GitHub linkage action, or create `.engineering-workflow` files.
- [ ] Prepare external profile declarations from the final commands in section 6. Bind Python verification to the actual product environment through the supported HISEW declaration. Do not route a Python command through an npm-only declaration to conceal an unresolved Python-environment observation gap.
- [ ] Resolve/hand off any old execution; stop its producers and preserve its records. Remove the old local Stop hook before enabling the personal replacement for that execution. Native hook trust remains a separate host action.
- [ ] Remove the embedded engine/scripts/skills/schemas, SDLC workflows and tests that exercise only retired behavior. Inspect tests containing unrelated behavior before removing a file; relocate any such case to its surviving owner's test file.
- [ ] In `.codex/config.toml`, remove the managed `[agents]` block and obsolete SDLC management comments. Preserve `approval_policy`, `sandbox_mode`, network settings and both existing MCP blocks. Remove only the SDLC Stop entry from `hooks.json`; delete the file only if nothing remains. Remove the old generated reviewer files and lifecycle rules listed in section 7 after their scoped approval.
- [ ] For ignored `.agents/skills` and `.claude/skills`, remove only activations still demonstrably owned by the six retired bundled sources. Preserve edited copies and unrelated external skills pending their owner's disposition. Never recursively remove an activation root or follow a junction into another installation.
- [ ] Verify whether any active native DCG configuration refers to `.sdlc/dcg` paths. Preserve the accepted operator-owned copy and native dispatch. Retire repository examples only after no live consumer relies on them; do not uninstall or relax DCG as a side effect.
- [ ] Demonstrate personal registration, execution, a real product check, a deliberate failing check in disposable input, verification invalidation and handoff on the selected installed artifact. Keep records externally. A native SessionStart/Stop claim additionally needs observed events in the chosen host; direct launcher tests are described as such.

**Proof:** Ordinary repository operation and CI need no HISEW. Personal HISEW operation needs no embedded UO engine. A fresh checkout does not create `.sdlc`; existing legacy evidence remains protected. No surviving active UO caller imports `_sdlc_*`, invokes the old gate, loads its skill policy or validates HISEW PR metadata.

**HISEW readiness limit:** The plan does not demand a new whole-platform release or qualification of every supported app. It requires the particular maintainer environment being adopted to work. If that prerequisite remains unmet, report repository separation and personal adoption as separate states; do not claim the complete migration is operational.

### SLICE-006 — Switch hosted enforcement and close the migration

**Resources:** The reviewed source candidate, GitHub ruleset 22485773, actual PR event runs, existing retained evidence and historical documentation.

- [ ] Review the complete source/configuration diff and run the final applicable product checks. Include independent review of the CI trust boundary, publication behavior and evidence preservation for this R2 migration. Reuse qualified HISEW evidence within its exact scope; do not require contributors to reproduce maintainer-only assessments.
- [ ] Publish the reviewed candidate only with the corresponding commit/push/PR authorization. Keep the existing `OWL Differential Analysis` requirement in place while proving the new terminal gates.
- [ ] Obtain successful native PR-event results for the four new check contexts, including the fork path and meaningful failure cases. Confirm actual app IDs and the tested head/merge revisions before updating required contexts.
- [ ] Apply the exact approved ruleset update from section 7. Add the four new terminal requirements first. Confirm enforcement; then remove the redundant early `OWL Differential Analysis` requirement. Do not clear the entire required-check list or disable the ruleset during transition.
- [ ] For the migration PR still evaluated by old trusted-base metadata automation, use the current approved transition record. Report the old linkage result honestly. Its obsolete requirements must not be satisfied with invented baselines or fake metadata; it is not a required context in the inspected ruleset.
- [ ] Confirm after merge that the retired SDLC issue automation and PR-linkage workflow no longer run, and ordinary PRs require no lifecycle labels or body fields. Leave existing issue labels/comments and accepted historical baselines intact; no mass historical rewrite is proposed.
- [ ] Publish a concise historical index identifying the last embedded implementation revision, the cutover revision, retained evidence owners and the current contribution/development documentation. Preserve necessary adopted decisions and evidence with their original identities.
- [ ] Reconcile every task-created location. Remove eligible task-owned scratch through the authorized native procedure; retain live installations, required evidence and any resource with an outstanding consumer. Do not delete old failures to make the migration look complete.

**Proof:** Fresh ruleset readback; the four correctly sourced terminal gates on the applicable candidate; a normal metadata-free contribution path; preserved domain behavior; a demonstrated personal maintainer path; documented resource disposition.

**Outcome observation:** Maintainers review the first real external contributions after cutover for setup failures, confusing requirements, irrelevant CI cost and missing checks. Record actionable findings in ordinary issues. No analytics platform, mandatory contributor telemetry or new recurring automation is introduced.

## 6. Verification catalogue and ownership

Use focused tests while changing a slice and the complete applicable product suite on the integrated candidate. This is the migration's verification catalogue, not a new runtime policy file. HISEW stores its selected command declarations externally.

| Check | Command or native owner | What it proves / limits |
| --- | --- | --- |
| Product dependency setup | `npm run setup:development` in a fresh authorized fixture | Installs the declared dependencies without workflow configuration. It does not prove product correctness. |
| Working-tree whitespace | `git diff --check` | Basic patch hygiene only. |
| JavaScript regression | `npm test -- --runInBand` | Existing product and retained development contracts. |
| Python regression | `npm run test:python` | Existing Python contracts, including product and retained optional setup tools. Jena-related skips must remain visible. |
| Static checks | `npm run lint`; `npm run format:check` | Current lint/format policy without auto-fixes. |
| Generated editing policy | `npm run check:editing-policy` | Generated policy matches its owning graphs. |
| Website build | `npm run build:check` after SLICE-002 | Same direct Vite build currently used for non-mutating-input verification. Writes ignored build outputs. |
| JSON-LD generator | `npm run generate:jsonld` | Existing generation behavior; unchanged serialized outputs are compared where deterministic. |
| MCP bundle | `npm run mcp:package:build` | Existing package build, with current distribution contracts. |
| Complete active ontology | `npm run validate:ontologies -- --purpose latest-active` | Product policy qualification of the actual active artifacts and their identities. |
| Independent engine parity | Existing Windows/Linux Jena qualification jobs; locally `node scripts/runRepositoryPython.js -B -m unittest tests.test_ontology_policy_engines -v` with qualified environment | Cross-engine behavior. Missing runtime means not run, never qualification. |
| Distribution/platform/container checks | Existing `archive`, `container`, `assemble` jobs | Actual development distribution boundary; do not substitute a website build. |
| Hosted gate behavior | Actual `pull_request` runs and native ruleset readback | Event permissions, applicable status identity and enforced merge conditions. |
| HISEW personal integration | Selected installed artifact's native registration/verification/handoff | Only the observed artifact, environment and host scope. |

Before invoking local cross-engine tests, the existing native `JenaRuntime.from_environment()` must succeed. Preserve provisioning evidence and do not download or substitute another Jena/JDK version merely to get a passing run. Hosted qualification already provisions its selected versions; the migration adds the explicit prerequisite check described in SLICE-003.

Neither `npm run build` nor deployment commands belong in HISEW's verification profile: `build` invokes auto-fixes, and deployment invokes external publication. Keep the engine's own environment separate from UO's product `.venv`.

For an independent verification pass, execute the accepted evidence on the frozen integrated candidate. A reviewer should specifically examine the publication counterexamples, selected-job failure behavior, safe fork path and absence of hidden HISEW prerequisites. This planning task has not run those checks or claimed their results.

## 7. Exact proposed change and approval scope

Approval should name the accepted revision of this document and the applicable groups below. It need not be requested separately for each ordinary edit inside an already accepted group. Commit, push, GitHub mutation, installation/trust and destruction of existing retained resources remain distinct actions.

### A. Product/configuration changes

| File | Exact proposed change | Behavioral/pipeline impact |
| --- | --- | --- |
| `package.json` | Remove `setup:sdlc`, `setup:sdlc:github`, `sdlc`, `check:sdlc`, `test:sdlc`; add `build:check` with the direct Vite command. | Removes embedded workflow entry points; exposes an ordinary build check. Other scripts/dependencies stay unchanged. |
| `requirements-dev.txt` | Create with retained `PyYAML==6.0.3` and `pip-tools==7.6.1`, with their actual purposes. | Maintains independent development-tool needs without a workflow requirements file. |
| `requirements-sdlc.txt` | Delete after all consumers are updated. | Retires engine-only direct requirements. |
| `requirements.lock.txt` | Regenerate from `requirements.txt` and `requirements-dev.txt`; prune only unused closure, retain other selections. | Changes environment/qualification identity; requires fresh product qualification. |
| `.gitignore` | Add `/reports/`; retain legacy evidence and unrelated configuration exclusions until their consumers release them. | Keeps generated product reports and old private evidence out of commits. |
| `.codex/config.toml` | Remove only the SDLC `[agents]` block and SDLC management comments; retain approval/sandbox/network settings and independent MCP blocks. | Ends repository-managed workflow roles without weakening the retained permissions. |
| `.codex/hooks.json` | Remove only the old SDLC Stop entry; delete the file if empty. | Stops invoking a retired engine. Does not register/trust HISEW hooks. |
| `.codex/rules/default.rules` | Retire the three old lifecycle rules after the explicit transition decision. | Removes legacy Issue-state/merge prompt rules; separate host permissions, agent authorization and GitHub controls remain applicable. |
| `.github/workflows/development-checks.yml` | Create the replacement Windows/Linux development checks and `Development checks` terminal job. | Preserves useful coverage formerly in SDLC CI. |
| `.github/workflows/ontology-validation.yml` | Add `Ontology checks`, hard-check Jena availability before parity; preserve product rules and provisioning. | Downstream QA/qualification become represented by a stable completion result. |
| `.github/workflows/verify-universal-ontology-mcp-distribution.yml` | Add `Product checks`; use `build:check` for the equivalent website command. | Exposes the whole applicable product/distribution result without changing release identity. |
| `.github/workflows/codeql.yml` | Remove fork exclusion and workflow path exclusions; add `CodeQL checks`. | Gives fork PRs the supported analysis path and reliable terminal status. |
| `.github/workflows/sdlc-control-tests.yml`, `sdlc-pr.yml`, `sdlc-issue-acceptance.yml` | Delete after coverage/transition requirements above are met. | Retires control tests, PR metadata enforcement and privileged issue-label/comment automation. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Replace with the four-section template in SLICE-004. | No internal workflow fields required from contributors. |
| `.github/ISSUE_TEMPLATE/bug.yml`, `change.yml` | Remove procedural requirements and default SDLC/state labels; retain useful symptom/proposal fields. | Allows ordinary reports/proposals without internal process knowledge. |
| `.github/ISSUE_TEMPLATE/config.yml` | Set `blank_issues_enabled: true`; retain both private-report contact links. | Permits reports outside the structured forms. |
| `.github/CODEOWNERS` | Remove entries only for deleted workflow/method paths. Retain surviving configuration/script/security owners. | Cleans ownership routing without creating teams, permissions or new review counts. |
| `AGENTS.md`, `REVIEW.md`, `CONTRIBUTING.md`, `SECURITY.md` | Apply the exact responsibility/scope changes in SLICE-004; preserve unrelated safety, licensing and reporting commitments. | Replaces mandatory work methods with product acceptance and accurately scoped local-agent permissions. |

`package-lock.json`, `skills-lock.json`, `jest.config.js`, `.node-version`, `.python-version`, `.java-version`, `.github/dependabot.yml`, `LICENSE`, `CODE_OF_CONDUCT.md`, `PRIVACY.md`, all product package manifests and all ontology/shape/activation source files are preserved by this plan. An unexpected necessary change to one is a scope revision, not silent permission to modify it.

### B. Active implementation retirement

Remove these tracked implementation files after the earlier slices preserve their surviving responsibilities:

```text
scripts/sdlc.py
scripts/sdlc_stop_gate.py
scripts/_sdlc_state.py
scripts/_sdlc_baseline.py
scripts/_sdlc_resource_disposition.py
scripts/set_up_sdlc.py
scripts/validate_sdlc_pr.py
scripts/bootstrap_github_sdlc.py
scripts/probe_dcg_hook_protocol.py
tests/sdlc-issue-acceptance.test.js
tests/sdlc/test_pipeline_controls.py
tests/sdlc/test_plan_baselines.py
tests/sdlc/test_resource_dispositions.py
tests/sdlc/test_repository_integration.py
tests/sdlc/test_github_readiness.py
tests/sdlc/test_dcg_protocol_probe.py
tests/sdlc/fixtures/concurrent_lifecycle_child.py
tests/sdlc/fixtures/verification_process.py
```

Retire the tracked files under `.sdlc/codex/`, `.sdlc/schemas/` and `.sdlc/skills/`, plus `.sdlc/pipeline-policy.json`, `.sdlc/verification.json`, `.sdlc/skill-policies.json`, `.sdlc/PACKAGE_STATUS.json` and `.sdlc/SOURCE_PACKAGE.json`. The version/status files are deleted as part of retiring this deployment; they are not edited to claim a new release or version. Their history remains recoverable.

The `.sdlc/dcg/` example/probe files are included only after the native-protection consumer check in SLICE-005. This removes repository copies and test probes, not the installed command-protection provider or its accepted operator configuration.

Remove the following eight generated `.codex/agents/` files, after comparison to their declared source: `principles_reviewer.toml`, `repo_explorer.toml`, `researcher.toml`, `review_maintainability.toml`, `review_operability.toml`, `security_requirements_reviewer.toml`, `test_oracle_reviewer.toml`, `verifier.toml`.

The six retired local skill names are `sdlc-route`, `motivation-to-evidence`, `quality-attribute-scenarios`, `thin-implementation-plan`, `test-driven-development`, `release-readiness`. This is not permission to remove external skills with coincidentally similar names, changed user copies, entire `.agents`/`.claude` directories or installed plugins.

### C. Documentation and historical records

Create `docs/development.md`, `docs/policy/README.md` and `docs/sdlc/README.md`. The last is a historical index, not a surviving workflow manual. Update the active navigation in `README.md`, `docs/README.md` and `docs/mcp/local-development.md`.

After current method consumers have moved to their HISEW-owned procedure, retire these generic manuals from the current checkout:

```text
docs/sdlc/howto.md
docs/sdlc/engineering-principles.md
docs/sdlc/proportional-workflow.md
docs/sdlc/subagent-playbook.md
docs/sdlc/github-governance.md
docs/sdlc/temporary-artefacts-howto.md
docs/sdlc/temporary-artefacts.md
docs/sdlc/codex-security.md
docs/sdlc/command-safety.md
```

Preserve `docs/sdlc/baselines/**`, `SDLC-BOOTSTRAP-01.md`, `verification.md`, `dcg-acceptance.md`, `sources.md`, `software-selection.md`, `toolchain-selection.md` and `package-reuse-assessment.md` as historical/source records. Update only `docs/sdlc/adoption.md`'s current-status introduction to identify retirement and link the historical index; do not rewrite earlier evidence.

Preserve `docs/plans/sdlc-improvements/**`, product specifications, accepted plans and reviews as historical planning material. They are not active setup instructions or a dependency of any normal test/build/CI entry point. Historic relative links are interpreted at their recorded source revision; the index supplies an immutable GitHub link to that revision. Do not alter accepted baseline bytes to repair old links.

`docs/policy/migration-evidence.md` contains old report locations that describe real past runs. Preserve those statements. Put the new current report location in `docs/policy/README.md`; historical receipts do not become current by editing documentation.

### D. GitHub enforcement proposal

Target only the freshly read ruleset `22485773`, subject to effective organization/branch policy verification:

1. Keep `enforcement: active`, target `refs/heads/main`, PR requirement, deletion and non-fast-forward protection, allowed merge methods and bypass settings.
2. Add required contexts `Ontology checks`, `Product checks`, `Development checks` and `CodeQL checks`, bound to the actual GitHub Actions integration observed for those checks. The existing observed integration is `15368`; verify it on the new jobs before applying.
3. Set `strict_required_status_checks_policy: true` so the required test result covers an up-to-date integration candidate. Maintainers own updating/rechecking the branch when needed; contributors need no special local tool.
4. After the new requirements are observed effective, remove only the redundant `OWL Differential Analysis` context. Its job remains an input to `Ontology checks`.
5. Preserve the current approval-count, code-owner-review and thread-resolution settings in this migration. A maintainer still reviews external contributions and controls acceptance; the plan does not silently impose new universal reviewer counts.

Do not delete remote labels, rewrite issues, create bots, enable auto-merge, add merge queues or change repository visibility as part of this update. Any additional effective rule discovered at execution is preserved until its owner decides otherwise.

### E. Personal setup and existing-resource disposition

HISEW installation/update, external registry/profile changes, live host selection/trust and removal of old ignored activations need the actual discovered paths and supported native proposals. This document does not guess those paths or authorize a `.codex` cache deletion.

Retained `.sdlc/runtime` material includes product qualification, MCP publication/recovery, security evidence and prior worktree records. A separate exact disposition must identify owners, consumers and verified preservation before deletion. Its directory name is not evidence that it is disposable. No recursive `.sdlc` deletion is approved by acceptance of the tracked-file retirement list alone.

## 8. Dependencies, rollout and recovery

| Slice | Requirements/criteria | Depends on | Demonstrable result |
| --- | --- | --- | --- |
| SLICE-000 | REQ-06/07; AC-09/10; QA-04 | Accepted scope and current inventory | Safe ownership/transition record |
| SLICE-001 | REQ-03; AC-04/05; QA-02 | SLICE-000 | Product reports and publication checks work without workflow storage |
| SLICE-002 | REQ-01/02/06; AC-01/02/09; QA-01/05 | SLICE-000 | Product-only setup; preserved optional tools |
| SLICE-003 | REQ-04; AC-06/07; QA-02/03 | SLICE-001/002 for final integration | Reliable product/development/security check results |
| SLICE-004 | REQ-05; AC-08; QA-01 | Final command and acceptance design | Usable contribution contract |
| SLICE-005 | REQ-02/06/07/08; AC-02/03/09/10/11/12; QA-04/05 | SLICE-001–004 and actual HISEW readiness for personal adoption | One personal workflow owner; retired embedded implementation |
| SLICE-006 | All acceptance criteria | Verified integrated source and authorized hosted operations | Enforced public acceptance and operational personal adoption |

Prefer one coordinated migration PR unless the owner chooses an additive CI preparation PR followed by the source retirement PR. A slice boundary is not an instruction to commit or publish. Keep the old required product check effective until replacement enforcement is verified.

If a slice fails before merge, preserve diagnostics and reverse only the migration's own edits as needed. Never restore unrelated working-tree content or run a destructive Git restoration operation. After merge, use a separately authorized corrective/revert commit tied to the exact migration; do not force-push history.

If hosted enforcement is wrong, keep merging paused while the administrator repairs the exact rule/check mismatch. Restore captured rule fields only under the appropriate approval; do not temporarily disable protection as a shortcut. A source revert cannot restore external evidence, environment contents or remote configuration, so each has its own preserved recovery input.

If HISEW fails after adoption, preserve external execution/evidence and use its supported pause/recovery/deactivation behavior. Product commands and GitHub remain usable. Do not silently reactivate the old engine or write a fallback engine into UO. Report personal adoption as degraded until repaired.

## 9. Open checks and replanning conditions

| Check | Current evidence | Owner and cheapest next discriminating action |
| --- | --- | --- |
| HISEW handles the actual Python environment | Static `.pth` incompatibility found; no installed reproduction executed | HISEW owner: exercise a freshly locked UO environment through the selected artifact's Python-environment declaration and resolve the supported contract there. |
| Actual selected host lifecycle | Source/package documentation distinguishes direct tests from host observations | Maintainer: inspect selected installation, then observe the specific personal lifecycle needed for adoption. No all-host qualification requirement is added. |
| Effective remote administration | Ruleset read succeeded; administrative protection read was forbidden | GitHub administrator: read effective rules/Actions settings and approve a narrow update against the captured state. |
| Retained evidence and source-method consumers | Main has no active pointer, but retained records and another worktree exist | Execution owner: obtain current consumer dispositions and verified external preservation before retirement. |
| Fresh setup after dependency pruning | Not run in this planning task | Implementer: run the final lock/setup in clean Windows/Linux fixtures, retain any dependency/platform failure. |
| Actual fork and negative gate behavior | YAML and platform semantics inspected; no new remote execution performed | CI owner: qualify native PR events on the reviewed candidate after publishing authorization. |

Replan the affected scope if a surviving product imports a retired engine module; a method consumer has no successor; HISEW needs a UO-specific wrapper; publication behavior changes beyond the output location; native gate semantics cannot meet the stated failure table; an administrative policy conflicts with the proposal; or preservation cannot be verified. Do not expand into MCP features, ontology-policy redesign, dependency modernization, licensing changes, cross-repository cleanup or new workflow tooling to hide such a conflict.

Completion means both the public contribution path and the selected maintainer personal workflow meet their acceptance criteria, with remaining historical resources explicitly retained. A completed code deletion, passing local suite, installed plugin or updated README alone does not establish that outcome.
