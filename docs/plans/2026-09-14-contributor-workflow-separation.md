# Universal Ontology contributor workflow separation implementation plan

**Terminology:** HISEW (Hadden Industries Software Engineering Workflow) is the software development lifecycle (SDLC) plugin developed by **Hadden Industries**, called **`software-engineering-workflow`**. Its source repository is [Hadden-Industries/software-engineering-workflow](https://github.com/Hadden-Industries/software-engineering-workflow), with the local checkout at `C:\Users\maksy\GitHub\software-engineering-workflow`. HISEW is distinct from Universal Ontology's **repository-owned SDLC controls**: the embedded workflow implementation, policies, automation and generated local activation targeted by this removal. References to removing SDLC controls in this plan mean those UO-owned controls, not the HISEW plugin. HISEW source, installation and configuration remain outside the removal scope.

Status: proposed, 14 September 2026; revised 15 September 2026 from the three removal precedents below. This document records a proposed local removal, not approval to execute it. The current task updates only this plan. Future removal must preserve tooling, applicable checks, unrelated work and historical evidence; remove generated local SDLC activation; and stop with uncommitted, unpushed changes. Do not configure HISEW, install a replacement workflow, change remote settings, commit, push or merge as part of removal. Earlier approval to publish the original plan does not authorize publishing this revision or its implementation.

**Goal:** Remove repository-owned SDLC workflow controls and their generated local activation while preserving Universal Ontology tooling, product acceptance and historical evidence. Contributors can use their chosen tools and methods; no replacement workflow setup is required.

**Architecture:** Universal Ontology owns its domain requirements, product validators, tests, build commands, publication safeguards and public contribution contract. GitHub owns hosted execution and merge enforcement. HISEW owns an opting-in maintainer's workflow execution, personal configuration and workflow evidence outside the repository. Host permissions and native command protection remain separate controls.

**Technical basis:** Existing npm scripts, the repository `.venv`, Git, GitHub Actions, RDFLib/pySHACL/Jena and existing product validators. No new framework, plugin wrapper, scanner, dependency family or compatibility shim is selected. HISEW installation, registration, profiles, lifecycle qualification and host trust are outside this removal.

**Spec and authority:** The 15 September instruction narrows the original design to removal following ONI, WebVOWL and Steam Community BBCode: inspect adoption and later changes; preserve local tooling and applicable CI/security checks; remove generated activation; preserve unrelated work and evidence; do not configure HISEW, commit or push. Exact configuration edits still require approval before execution. Remote enforcement redesign and personal workflow adoption are excluded, not completion prerequisites.

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
| [GitHub: Required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) — platform contract | Workflow-level skips can leave required checks pending; conditionally skipped jobs may count as successful. Checks are tied to applicable commit/event identities. | Preserve existing failure propagation; record broader terminal-gate improvements separately. Do not infer complete acceptance from one early successful job. |
| [GitHub: Workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [secure use](https://docs.github.com/en/actions/reference/security/secure-use) — platform/security guidance | Fork PRs have restricted token/secrets access; privileged events must not execute untrusted candidate code. Immutable action references reduce supply-chain exposure. | Execute contributions on `pull_request`; preserve restricted permissions and pinned actions. Remove obsolete privileged metadata automation. |
| [GitHub: Code-scanning permission errors](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/resource-not-accessible) — platform guidance | Code-scanning upload behavior on `pull_request` supports the untrusted Dependabot contribution path. | Preserve current security boundaries; broader fork scanning remains a separate proposal. |
| [W3C SHACL Recommendation](https://www.w3.org/TR/2017/REC-shacl-20170720/) — normative specification | A processor evaluates a data graph against a shapes graph and produces validation results. | Keep the shapes, graph selection, supported processor and report interpretation in Universal Ontology. A workflow engine must not duplicate those rules. |
| [W3C OWL 2 structural specification](https://www.w3.org/TR/owl2-syntax/#Ontology_IRI_and_Version_IRI) — normative specification/conventions | Ontology and version IRIs identify ontology versions; imports and version accessibility have defined semantics. | Preserve ontology identities, import behavior and publication contracts throughout the migration. |
| [W3C Data on the Web Best Practices](https://www.w3.org/TR/dwbp/) — Recommendation | Provenance, persistent identifiers, version history, vocabulary reuse and consumer feedback are data-publishing responsibilities. | Retain source attribution, semantic review, compatibility decisions and identifiable releases as product concerns. |
| [Python 3.14 `site`](https://docs.python.org/3.14/library/site.html) — runtime specification | `.pth` files can extend import paths and execute import statements during startup. | Preserve environment contents. The historical HISEW integration question is outside removal. |

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

### Source identities (14 September observations; not refreshed operational claims)

- Universal Ontology: `C:/Users/maksy/GitHub/universal-ontology`, `main`, `1802ab1b39eda578da694f17979c393db70cc9c6`. The working tree was clean before this plan. GitHub's `main` matched this revision.
- HISEW: `C:/Users/maksy/GitHub/software-engineering-workflow`, initially `4c28d3cd9fa57d21172e6fe40fdb11f86ecd85e2`, refreshed to `cc202736d4444fb5647336b82f0e01c029ba843c` during final review. Both inspections found a clean working tree. The intervening task-lock/qualification correction and rebuilt bundles do not change the inspected personal-mode, setup or Python-environment contracts. Installed-artifact qualification remains a separate check.
- Native Git listed the Universal Ontology main checkout and the separate `dependabot-67-validation` worktree. No worktree removal is proposed.
- No `.sdlc/runtime/active.json` existed in the main checkout when inspected. Several retained runtime/evidence directories do exist. This does not establish that all other worktrees or external consumers are idle.
- HISEW's current [product scope](../../../software-engineering-workflow/docs/product-scope.md) excludes source cutover from its existing implementation authorization. This plan therefore supplies a separate proposed UO migration scope.

### Findings that affect implementation

1. **Embedded workflow duplication is real.** UO contains the lifecycle scripts, `.sdlc` schemas and skills, generated `.codex` agent settings and Stop hook, baseline validation, issue-state automation and SDLC-specific tests. HISEW already owns corresponding personal workflow capabilities in its source and packages.
2. **Development setup has workflow side effects.** `scripts/setUpDevelopmentEnvironment.js` invokes `scripts/set_up_sdlc.py` after dependency installation. It also requires `requirements-sdlc.txt`. Removing only contribution-guide wording would leave the installation dependency intact.
3. **The skill installer has mixed responsibilities.** At the inspected HEAD, `setup:skills` refreshes external declarations and activates bundled SDLC skills. Today's merged floating-reference behavior belongs to independent work and must survive. Remove only the bundled SDLC discovery, activation and policy coupling.
4. **Product reports currently live under the workflow directory.** `scripts/ontology_policy/reports.py` sets `REPORT_DIRECTORY` to `.sdlc/runtime/policy-reports`. `publication.py` consumes the same directory before `upload_to_s3.py` uploads. These product safeguards and their existing output location remain.
5. **The SDLC workflow contains product tests.** `.github/workflows/sdlc-control-tests.yml` exercises the installed ontology runner, development setup, the Python launcher, optional MCP/skill setup and check selection. Preserve those tests in product/development CI before deleting the workflow.
6. **Current merge enforcement is narrower than the workflow inventory.** [Ruleset 22485773](https://github.com/Hadden-Industries/universal-ontology/rules/22485773), read live, is active on `refs/heads/main` and requires only `OWL Differential Analysis`, from integration `15368`. It also requires a PR and prevents deletion/non-fast-forward updates. Required approval count is zero; code-owner review and strict status freshness are disabled; there are no listed bypass actors. The ruleset does not currently require SDLC linkage, complete ontology qualification, MCP distribution, or CodeQL completion.
7. **An early ontology check does not cover its successors.** `policy-qa` and the Windows/Linux `qualify` matrix depend on the required `validate-ontologies` job. Requiring only the latter does not require those downstream jobs to succeed.
8. **CodeQL omits fork PRs.** Its scope job has a same-repository condition, and the workflow has top-level Markdown/OWL path exclusions. This historical gap does not authorize expanded coverage or a new required check during removal.
9. **Agent configuration is mixed.** `.codex/config.toml` contains SDLC-managed agent settings, host permission settings, and independently managed MCP blocks. Removing the whole directory would discard unrelated settings.
10. **HISEW adoption has a concrete environment gap.** UO's Python 3.14.7 `.venv` disables system site packages but contains `Lib/site-packages/distutils-precedence.pth`. HISEW's `python_environment_inventory()` in `verification_commands.py` rejects any `.pth` or `.egg-link` file. This is a static incompatibility with the current Python-environment verification route, not a completed installed-plugin test.

The GitHub CLI read returned HTTP 401. The connector successfully read the ruleset and branch metadata, but the administrative branch-protection endpoint returned HTTP 403. Additional host/organization settings and effective administrative policy must be read by an authorized operator before remote changes. A failed read is not evidence that a control is absent.

No setup, dependency installation, product tests, live scan, plugin lifecycle, publishing operation or remote mutation was performed for this planning assessment.

### Removal precedents inspected on 15 September 2026

These are evidence for the removal method, not a file-deletion list to copy. Commit diffs establish tracked changes; task records additionally describe ignored activation removal, operator decisions and verification. Their test results do not qualify UO.

| Precedent | Observed lesson | UO application |
| --- | --- | --- |
| ONI: [commit 0a94775aa143df76131c29768079da6f58484436](https://github.com/MaksymShostak/oxygen-not-included/commit/0a94775aa143df76131c29768079da6f58484436), [ONI: Remove SDLC](codex://threads/01a0a212-58e9-7300-900c-5077cebdb66a) | A blanket adoption revert would lose the later README converter. The initial language pruning missed surviving `clean.py`; Python CodeQL and `.python-version` were retained. The task separately verified removal of 28 generated activation files after exact approval. | Trace later product consumers; inventory actual remaining languages before changing security coverage. Include ignored activation in the approval and completion scope before removing its source scripts. |
| WebVOWL: [commit bfcefbde5bd67c9dd93223509919a650aef23fde](https://github.com/Hadden-Industries/webvowl/commit/bfcefbde5bd67c9dd93223509919a650aef23fde), [WebVOWL: Remove SDLC](codex://threads/01a0a252-5190-7241-9743-1892e7530146) | External agent/MCP setup and its later safety fixes survived. `yaml` still served security tests; PyYAML served metadata tooling. Python tooling tests moved into Linux/Windows application CI before SDLC CI retirement. The task recorded 27 activation files removed and 664 preserved files unchanged. | Preserve shared helpers, parser dependencies and cross-platform setup coverage by consumer. Compare mixed Codex configuration and retained evidence before/after. Do not copy ONI's removal of tooling that UO still uses. |
| Steam Community BBCode: commit `79980cb58c90881edda7e06beffd04d32b0f7db4` in `C:/Users/maksy/GitHub/steam-community-bbcode`, [BBCODE: Remove SDLC](codex://threads/01a0a450-3364-7ea1-b4b0-d4a5da4bd209) | The prose formatter still needed the Python launcher, pin, environment and pip updates. Release metadata's SDLC result was removed from producer, gate, publication assertion and tests together, preserving runtime/mutation and CodeQL qualification. Six adoption/provenance records were archived unchanged. A generated conformance hash was refreshed through its producer after `package.json` changed. | Trace publication and generated-artifact consumers as well as workflows. Preserve real product receipt requirements; regenerate only current derived outputs through their owners, never historical receipts or approval digests. |

ONI's reported 374 pipeline tests, WebVOWL's reported 1,745 Jest tests and retained hosted checks, and BBCode's reported complete package check are historical, repository-specific evidence. BBCode's removal turn explicitly reported no hosted run; later publication in the named commit is a separate event. WebVOWL required a later, separate approval to remove only obsolete `SDLC controls` and `validate` branch requirements. The old trusted-base validator still ran on its removal PR. None of those later commit, push, merge or remote-policy approvals applies here.

UO history currently identifies adoption `42b6f93`, subsequent command protection `1d4f7c3`, deployment documentation `3d9745b`, verification retention `f148761`, execution ownership `eb63100`, resource disposition `c5c355b`, accepted-plan support `350df08`, and product publication/report integration `2440e6e`. This is an inspection starting point, not an exhaustive ownership verdict. Inspect each relevant path's later changes through the actual execution HEAD, including setup and external-skill fixes. Record **remove**, **retain**, **split**, or **historical** with the surviving consumer and verification for each mixed responsibility.

Additional concrete lessons from the same diffs:

- **Keep adoption manifests accessible:** BBCode preserved package status, source/import manifests and the associated notice as byte-identical archive files, rather than relying only on Git history. UO has `.sdlc/PACKAGE_STATUS.json` and `.sdlc/SOURCE_PACKAGE.json`; archive these as specified below before retiring their active locations. Do not invent import manifests that UO does not have.
- **Check archive consumers:** BBCode adjusted formatting exclusions while retaining historical records. UO's current `.prettierignore` does not exclude historical SDLC records. Inspect formatting, test discovery, documentation indexing and package inclusion at the proposed archive destination; a move must not silently reformat evidence or add it to a shipped artifact. Propose an exact exclusion only if a real consumer needs it.
- **Separate obsolete notice prose from retained attribution:** BBCode removed the paragraph describing deleted lifecycle controls but retained the notice for its surviving Python launcher. Inspect notices by retained code and archived material; neither deleting all SDLC-related notices nor keeping stale active-component claims is correct. Preserve applicable notice bytes with retained artifacts.
- **Include declared contracts:** BBCode removed its retired release field from the JSDoc type as well as the producer, validation, workflow assertion and fixture. Audit types, generated API documentation and caller fixtures alongside runtime consumers when UO has a changed contract. Do not introduce a legacy fallback simply to accept the removed field.
- **Remove whole configuration files only when wholly retired:** BBCode deleted its SDLC-only issue configuration, whereas WebVOWL retained its blank-issue setting and repaired the development link. Inspect UO's mixed forms, contact links and CODEOWNERS entries individually; preserve unrelated reporting routes and owners.

## 3. Selected design and alternatives

**DEC-01 — Remove without replacement setup.** UO will contain no HISEW dependency, `.engineering-workflow` policy, HISEW action, registration, generic lifecycle wrapper or required HISEW PR metadata. Do not inspect or modify personal registries/profiles, configure HISEW, qualify its Python environment, or install a replacement TDD skill. The original `.pth` finding remains historical background and does not block SDLC removal.

**DEC-02 — Keep acceptance public and product-owned.** Contributors explain the problem, change and relevant checks; ontology changes additionally explain sources and semantic impact. Maintainers can request additional evidence for a concrete risk and can help produce it. Choice of editor, assistant, test-writing order and workflow tool does not affect submission eligibility.

**DEC-03 — Retain domain safety.** Preserve `policy/`, all ontology rules and activation records, the generated editing policy, publication checks, existing import/query/projection contracts and independent fixtures. Preserve the publication receipt's default `.sdlc/runtime/policy-reports` location and existing `--report-directory` behavior. Its directory name does not make it an active workflow control. Report relocation is outside this removal.

**DEC-04 — Preserve applicable CI/security behavior.** Move surviving tests out of retired workflows and remove only SDLC selection/metadata dependencies. Retain UO's product-owned selector, existing check names, supported events, permissions, action/runtime pins and failure behavior. New required check contexts, stricter rulesets and expanded fork coverage from the original plan are separate proposals, not part of this removal.

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

The residual custom work is limited to removing SDLC setup invocation, preserving product-check selection and migrating retained test callers. There is no need to research or select another workflow platform. Existing runtime and dependency versions remain the baseline: Node 24.21.0, npm 12.0.2, Python 3.14.7, JDK 25.0.4.1, pySHACL 0.40.1 and Jena 6.2.0. No HISEW source or license is copied into this MIT product. Existing notices remain intact.

## 4. Requirements and acceptance criteria

These identifiers organize this one migration; contributors will not be required to use them.

| Requirement | Acceptance criterion and meaningful counterexample |
| --- | --- |
| REQ-01: Contribute without HISEW | AC-01: A fresh checkout can install product dependencies and run its documented checks on Windows and Linux with no plugin, workflow registry, active SDLC engine or agent skills present. Product report output under `.sdlc/runtime/policy-reports` is permitted. A checkout that requires a lifecycle initialization step fails. |
| REQ-02: Remove active workflow controls | AC-02: Active UO source, tests, setup and CI contain no generic SDLC engine or HISEW integration. AC-03: All confirmed generated SDLC hooks, roles, rules and skill activations are absent; unrelated local configuration/skills remain unchanged, and normal setup does not recreate retired activation. |
| REQ-03: Preserve ontology and publication behavior | AC-04: Existing source/shape/activation bytes and golden expectations remain unchanged. AC-05: Changed sources, policy, authority snapshot, lock or built artifact still invalidate publication qualification; an old workflow receipt cannot qualify publication. |
| REQ-04: Preserve applicable checks | AC-06: Every surviving product/tooling/security test previously run by retired CI has a surviving command and CI owner; existing required jobs retain their names and failure propagation. AC-07: Retained event permissions, language coverage, dependency-review policy and release checks are preserved. Local checks establish the changed contracts; hosted execution remains explicitly unrun without separate publication authority. |
| REQ-05: Remove procedural submission barriers | AC-08: Ordinary PRs and issue reports need no risk class, accepted-baseline identifiers, software-selection dossier, cleanup ledger, particular test method or tool installation. CI and normal review accept a concise truthful submission. |
| REQ-06: Preserve unrelated work and controls | AC-09: External skill refresh, native lock updates, optional MCP setup, permission settings and independent user-owned agent data remain functional and unchanged except for approved SDLC-specific removals. |
| REQ-07: Preserve and resolve migration state | AC-10: Every retired active control has an identified successor or explicit retirement decision. Retained evidence remains readable with its original identity; no historical result is relabelled as current. |
| REQ-08: Bounded local handoff | AC-11: No HISEW setup, registration, profile or trust change occurs. AC-12: The removal ends uncommitted and unpushed, with exact local activation readback, preservation results, checks and any blocked resources reported. Remote controls remain unchanged. |

Quality scenarios:

- **QA-01, contributor usability:** A first-time contributor changes a documentation sentence and opens a normal PR. The template is understandable without internal terminology, irrelevant expensive jobs are avoided, and required gate checks still terminate.
- **QA-02, regression containment:** An implementation fixture causes an ontology violation or a product test failure. The owning check and any existing dependent gate fail even if unrelated jobs succeed.
- **QA-03, isolation:** A fork PR includes hostile text in its description and changes a candidate build script. It receives neither publication credentials nor privileged metadata execution; no workflow interpolates PR text as shell code.
- **QA-04, recovery:** The cutover is interrupted between tracked source removal and local activation cleanup. Existing records remain readable, the operator can identify which stage completed, and no partial transition is described as adopted.
- **QA-05, change locality:** A subsequent HISEW upgrade requires no UO source patch; a UO validation change is implemented once in product code and used by both callers.

## 5. Implementation slices

Risk assessment for this migration: R2 is justified by removal of active controls, CI dependencies, product publication coupling and retained state. This classification describes the maintainer migration only. It does not become a public contribution requirement.

Max is the decision owner. The implementing maintainer owns the integrated local UO candidate and preservation handoff. Remote administration and HISEW readiness have no execution steps here. No parallel writes are assumed. Slices may be verified separately; coupled source removals and configuration changes should land as a coordinated candidate, not as temporarily broken main-branch states.

### SLICE-000 — Confirm migration authority, consumers and preservation

**Files/resources:** This plan; adoption commits and per-path history; existing `.sdlc/runtime/` and `.sdlc/tmp/` records; the native worktree inventory; generated `.codex`, `.agents` and any `.claude` activation; read-only remote enforcement inventory when available.

**Consumes:** The user's accepted outcomes and the inspected identities above.

**Produces:** An accepted exact scope, a selected execution owner and a short current-state/preservation record in the existing task or approved external evidence store.

- [ ] Refresh Git status, HEAD, index, untracked/ignored paths and native worktree ownership. Inspect adoption and every later relevant change through that HEAD, classifying mixed files by surviving consumer. Account for other worktrees without modifying them. Use prior history as evidence, never as a restoration source for user-owned changes.
- [ ] Inventory actual source languages, dependency imports, setup helpers, workflow callers, release metadata producers/validators and generated outputs. Map each retained check to its post-removal command, platform and CI job before approving deletion of a workflow or dependency.
- [ ] Enumerate exact generated activation files and managed blocks, compare them to their source templates and later local edits, and capture preserved MCP/network/permission settings plus evidence hashes/readback. Obtain exact local-configuration scope before deleting the scripts a Stop hook calls. A clean Git status cannot prove ignored activation removal.
- [ ] Inspect actual active/paused tasks and retained-resource consumers. Record which ongoing HISEW work still reads UO's old method. Require a consumer handoff before deleting a method file it still needs.
- [ ] Preserve applicable source history, uncommitted/index contents if present, ignored evidence, relevant configuration and reconstruction instructions. Verify readback from storage outside any resource being retired. A Git commit or digest alone does not preserve ignored evidence.
- [ ] Accept the exact configuration changes in section 7 and a one-time transition rule: after retiring the embedded engine, final local evidence comes from retained product commands, consumer checks and review; hosted runs remain a later qualification. The removed `check:sdlc`/`test:sdlc` checks are retired obligations, not fabricated passes.
- [ ] Select exactly one workflow owner for the migration execution. Close or hand off any previous execution with its supported procedure before retiring its hooks. Preserve its state; do not manually clear active records or enable another Stop gate.

**Proof:** Current source identities, explicit scope/transition decision, actual consumer readback and retained-evidence verification. Preserve any unknown ownership as a hold on that resource; independent source planning or test preparation can continue.

**Release/recovery:** No deletion or remote change in this slice. Historical product baselines retain their bytes and paths.

### SLICE-001 — Preserve product reporting and publication safeguards

**Inspect/retain:** `scripts/ontology_policy/reports.py`, `scripts/validate_ontologies.py`, `.gitignore`, `tests/test_ontology_policy_cli.py`, `tests/test_publication_gate.py`, `tests/distribution/universal-ontology-mcp-distribution-workflow.test.js`. Edit only a demonstrated retired-engine dependency or obsolete instruction.

**Inspect/retain:** `scripts/ontology_policy/cli.py`, `scripts/ontology_policy/publication.py`, `scripts/upload_to_s3.py`, `policy/`, `docs/policy/Editing-Policy.generated.md`.

**Consumes:** Existing report and qualification contracts.

**Produces:** Preservation evidence for the existing report path, validation, receipt schema and publication refusal conditions after engine retirement.

- [ ] Trace the existing report writer, shared default, publication consumer and tests. Preserve `.sdlc/runtime/policy-reports`, explicit-directory behavior and receipt semantics. Do not relocate output or add a fallback search.
- [ ] Preserve runtime ignores, test-discovery exclusions and existing product fixture locations unless an actual retired-engine dependency requires an approved change. Product output under `.sdlc` does not recreate the workflow engine or activation.
- [ ] Remove the validator docstring's claim that SDLC profiles are an owning integration. Document its ordinary CLI/CI/pre-commit consumers.
- [ ] Run existing report/publication tests on the removal candidate. Retain previous receipts as historical; do not refresh their hashes or treat retention as current publication qualification.

**Proof:** The following counterexamples continue to refuse publication: missing receipt, diagnostic-purpose receipt, changed policy, changed authority snapshot, changed dependency lock, incomplete module set, changed source and mismatched generated bytes. Default and explicit report locations work as before without the retired lifecycle engine. No new test is needed merely to restate an unchanged default.

**Focused commands:** Use the existing repository launcher for selected unittest modules:

```sh
node scripts/runRepositoryPython.js -B -m unittest tests.test_ontology_policy_cli tests.test_publication_gate -v
npm test -- --runInBand --runTestsByPath tests/distribution/universal-ontology-mcp-distribution-workflow.test.js
```

**Recovery:** Reverse only this slice's own edits if needed, without committing; preserve existing report output. Never reinterpret a previous receipt as a new qualification.

### SLICE-002 — Make product setup and checks independently usable

**Modify:** `scripts/setUpDevelopmentEnvironment.js`, `scripts/set_up_agent_skills.py`, `tests/set-up-development-environment.test.js`, `tests/test_set_up_agent_skills.py`, `package.json`, `requirements.lock.txt`.

**Create:** `requirements-dev.txt`.

**Retire after all consumers are updated:** `requirements-sdlc.txt`.

**Retain:** `requirements.txt`, `package-lock.json`, `skills-lock.json`, `scripts/runRepositoryPython.js`, `scripts/set_up_mcp_servers.py`, `scripts/_commands.py`, `scripts/_repository.py`, `.githooks/pre-commit`, `scripts/configureGitHooks.js` and their independent tests.

Also inspect shared configuration-transaction helpers and their surviving imports before removal; ownership follows their external setup consumers, not the adoption commit that changed them. Preserve existing repository identity, path safety, Unicode/worktree, source validation and transaction-recovery fixes. Keep JavaScript YAML/schema packages with remaining product/security consumers; remove a Python schema requirement only after inspecting imports and dependency closure. No installed package is uninstalled by this plan.

- [ ] Add setup tests asserting that normal development setup installs the locked dependencies but never invokes SDLC setup, skill refresh, MCP installation, plugin installation, hook trust or a publication command.
- [ ] Remove the `set_up_sdlc.py` invocation and replace the setup input requirement for `requirements-sdlc.txt` with `requirements-dev.txt`.
- [ ] Preserve the current lock integrity and unusable-environment diagnostics. An existing environment with removed dependencies may need an explicit operator decision; do not automatically delete or uninstall from the user's `.venv`.
- [ ] Preserve the AWS CLI probe/warning and independent deployment behavior. Removing the warning is unrelated setup cleanup.
- [ ] Retain `PyYAML==6.0.3` for the optional skill tool's metadata consumer and `pip-tools==7.6.1` for maintaining the hash lock in `requirements-dev.txt`. Remove the retired engine's direct `jsonschema`, `rfc3339-validator` and `rfc3986-validator` requirements only after confirming the remaining dependency closure. Let the native resolver decide whether any remains transitively needed.
- [ ] Regenerate `requirements.lock.txt` with the existing pip-tools route and the two new owning input files. Preserve retained package versions and hashes unless the resolver produces a separately reviewed necessary difference. Do not perform a dependency upgrade during this cleanup.
- [ ] Remove only the installer's `.sdlc/skills` discovery/activation, `.sdlc/skill-policies.json` policy application, local-only CLI path and corresponding callers. Preserve native external refresh, floating refs, source validation, unrelated-skill preservation and existing external metadata behavior. Do not reset `skills-lock.json`.
- [ ] Preserve existing build commands and lifecycle behavior. Use the documented direct Vite invocation when verification must preserve tracked inputs; do not add a `build:check` command.
- [ ] Remove the obsolete npm entry points `setup:sdlc`, `setup:sdlc:github`, `sdlc`, `check:sdlc` and `test:sdlc` in coordination with SLICE-005. Keep `setup:skills` and `setup:mcp` explicitly optional.
- [ ] Inspect current generated product manifests/reports whose input identity includes changed package or requirements files. Regenerate affected current outputs only through their existing owning command and compare semantic content, recording why an identity changes. Do not hand-edit hashes, refresh historical qualification, or add a BBCode-style artifact where UO has no such consumer. Any newly discovered tracked configuration/output change needs its exact scope recorded before execution.

Native lock command, executed only in the implementation's authorized `.venv`:

```sh
node scripts/runRepositoryPython.js -m piptools compile --allow-unsafe --generate-hashes --no-strip-extras --output-file=requirements.lock.txt requirements.txt requirements-dev.txt
```

**Proof:** A fresh Windows/Linux checkout completes `npm run setup:development` with no workflow/agent prerequisites, produces no workflow configuration and preserves tracked input files. Faults in npm installation, hash installation or pip consistency still fail. External skill refresh tests retain today's floating-branch behavior. Existing MCP setup and Python launcher tests remain covered.

If a declared local dependency is missing, distinguish an environment gap from a removal regression. Follow WebVOWL's locked-reinstall approach: report the failure, repair missing dependencies from the unchanged approved lock within installation authorization, and rerun affected checks. This permits no upgrade, trust change, or deletion/recreation of the existing environment. Never delete a useful test/dependency or claim a pass from an incomplete environment.

**Focused commands:**

```sh
npm test -- --runInBand --runTestsByPath tests/set-up-development-environment.test.js tests/run-repository-python.test.js tests/configure-git-hooks.test.js
node scripts/runRepositoryPython.js -B -m unittest tests.test_set_up_agent_skills tests.test_set_up_mcp_servers -v
```

Tests using a disposable external-skill Git fixture exercise that fixture, not an actual refresh of the user's installed skills.

### SLICE-003 — Preserve applicable CI and security checks

**Modify:** `scripts/selectPullRequestChecks.js`, `tests/pr-check-scopes.test.js` and approved retained workflow consumers. **Create:** `.github/workflows/development-checks.yml`, `tests/development-workflow.test.js`. **Retire:** `.github/workflows/sdlc-control-tests.yml` after useful coverage has moved.

- [ ] Map every existing SDLC CI command to a retired engine test or a surviving product/tooling test. Move setup, Python launcher, optional MCP/skill setup, Git-hook and selector checks to development CI with their Windows/Linux coverage and dependency installation guarantees.
- [ ] Replace only the SDLC selector category with development applicability. Retain UO's product, ontology, MCP and CodeQL selection: this selector has surviving consumers, unlike the retired ONI/WebVOWL selectors. Test selection for retained implementations, tests, dependency/runtime inputs and owning workflows.
- [ ] Preserve existing check names, events, action/runtime pins, permissions, credentials isolation and failure propagation. Ensure no surviving `needs`, reusable-workflow call or npm command references a removed job. Exercise selected failure and unexpected skip cases through existing YAML/parser consumers.
- [ ] Inventory surviving Actions, Python and JavaScript/TypeScript sources before language pruning. Retain applicable CodeQL coverage, dependency-review policy, independent security tests and Dependabot ecosystems with surviving manifests. Standard-library Python still merits language analysis; formatter/metadata tooling still needs its dependencies and updates.
- [ ] Trace release qualification through producer, parser/schema, workflow assertion, publication consumer and tests. Remove a generic SDLC success field only if one exists and the exact change is approved. Preserve product receipt, runtime, signature/provenance and security requirements. BBCode's field removal is a tracing precedent, not evidence that UO has that field.
- [ ] Preserve existing CodeQL fork/path behavior during this removal. Record pre-existing gaps separately. Do not add the original plan's four terminal contexts, strict freshness change, merge queue or new remote requirements.

**Proof:** Run selector, development-workflow and retained setup/security tests; parse changed YAML through the existing consumer and inspect all callers. Local checks do not qualify hosted execution. Do not create test PRs or rerun remote jobs under this scope.

**Focused command:** `npm test -- --runInBand --runTestsByPath tests/pr-check-scopes.test.js tests/development-workflow.test.js tests/distribution/universal-ontology-mcp-distribution-workflow.test.js`, plus SLICE-002's retained Python/setup checks. Keep existing ontology and MCP workflows and their required job identities; change only approved consumer references.
### SLICE-004 — Repair contributor guidance after SDLC removal

**Modify:** `CONTRIBUTING.md`, `README.md`, `REVIEW.md`, `AGENTS.md`, `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/change.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/CODEOWNERS`, `docs/README.md`, `docs/mcp/local-development.md`.

**Create only if needed to preserve useful instructions from retired guides:** `docs/development.md`, `docs/policy/README.md`. Prefer an existing owning guide where suitable. Remove SDLC obligations and repair their documentation consumers; preserve independent product expectations rather than redesigning contribution policy.

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

### SLICE-005 — Retire the embedded engine and generated local activation

**Retire:** Confirmed active-engine files in section 7 and their source-only tests. **Modify:** Only approved SDLC-managed sections of mixed local configuration. Preserve product setup, external skills and host protections.

- [ ] Resolve active/paused consumers through supported handoff before retiring controls. Preserve state/evidence; do not clear an active pointer or rewrite a receipt to suppress a gate. No replacement workflow is required.
- [ ] Compare exact local activation paths with source templates and later local edits. Remove confirmed SDLC Stop entries, eight generated reviewer files, lifecycle rules and six bundled skill activations from each actual destination. Inspect `.agents/skills` and `.claude/skills`; precedent counts are not UO's expected count.
- [ ] Remove only approved SDLC role blocks/comments from mixed `.codex/config.toml`. Preserve independently applicable approval/sandbox/network settings, MCP blocks and other hooks/rules. Delete a container file only when its sole content is the approved retired content. Hold user-edited copies for disposition.
- [ ] Coordinate local hook removal with tracked script removal so a surviving Stop hook cannot invoke deleted code. If permission review blocks cleanup, report the exact hook/path and incomplete removal; do not bypass the guard or claim success from tracked deletions alone.
- [ ] Inspect links/junctions and resolved targets. Remove only approved activation entries without following them into external installations. Never recursively remove activation or `.sdlc` roots. Preserve external skills/locks, MCP, native DCG configuration and global host trust.
- [ ] Check live consumers of `.sdlc/dcg` examples before retiring copies. Unresolved consumers keep those resources on hold; removal does not uninstall or relax command protection.
- [ ] Read back every removed activation path and retained mixed configuration. Compare preserved evidence bytes, link targets and readable historical records against the initial inventory. Verify normal setup cannot recreate retired activation in a disposable fixture.

**Proof:** No active caller imports the retired engine or invokes its gate; confirmed generated hooks/roles/rules/skills are absent. Preserved configuration/evidence matches initial contents except for exact approved edits. Report tracked retirement and ignored activation separately. HISEW remains untouched.

### SLICE-006 — Verify and hand off the local removal

- [ ] Review the complete diff against adoption/later-change ownership and accepted removal scope. Run retained setup/product/security checks and publication refusal cases on the actual candidate. Preserve failures, skips and unavailable checks.
- [ ] Classify remaining SDLC references as active caller, historical record or protective ignore. Remove retired active callers; preserve accepted baseline bytes/paths and historical results. Add a historical notice/index without rewriting old decisions.
- [ ] Report actual branch/HEAD, changed paths, exact activation readback, preservation results, checks and remaining holds. Record obsolete required checks found by read-only remote inspection; unavailable inspection means unknown, not absent.
- [ ] Reconcile task-created scratch and evidence using the existing temporary-artifact procedure. Remove eligible owned scratch only; retain failure/review/recovery records with owner and reassessment event.
- [ ] Verify archived manifests are byte-identical to their source inventory and their historical notice links to the exact pre-removal revision. Check the actual formatter, documentation and distribution consumers for the archive paths; report their observed inclusion/exclusion instead of inferring it from `.gitignore`.
- [ ] Stop with uncommitted, unpushed changes. Do not stage for commit, create/update a PR, merge, alter remote protection, configure HISEW or install a replacement skill.

**Proof:** Applicable local criteria are met or exact blockers are reported. Hosted execution remains unverified. A later separately authorized publication may still run a trusted-base SDLC validator, as WebVOWL did; do not fabricate metadata or acceptance to make it pass.
## 6. Verification catalogue and ownership

Use focused tests while changing a slice and the complete applicable product suite on the integrated candidate. This is the removal's verification catalogue, not a new runtime policy file or personal workflow profile.

| Check | Command or native owner | What it proves / limits |
| --- | --- | --- |
| Product dependency setup | `npm run setup:development` in a fresh authorized fixture | Installs the declared dependencies without workflow configuration. It does not prove product correctness. |
| Working-tree whitespace | `git diff --check` | Basic patch hygiene only. |
| JavaScript regression | `npm test -- --runInBand` | Existing product and retained development contracts. |
| Python regression | `npm run test:python` | Existing Python contracts, including product and retained optional setup tools. Jena-related skips must remain visible. |
| Static checks | `npm run lint`; `npm run format:check` | Current lint/format policy without auto-fixes. |
| Generated editing policy | `npm run check:editing-policy` | Generated policy matches its owning graphs. |
| Website build | `node node_modules/vite/bin/vite.js build` | Existing direct build avoids root prebuild auto-fixes. Writes ignored build outputs. |
| JSON-LD generator | `npm run generate:jsonld` | Existing generation behavior; unchanged serialized outputs are compared where deterministic. |
| MCP bundle | `npm run mcp:package:build` | Existing package build, with current distribution contracts. |
| Complete active ontology | `npm run validate:ontologies -- --purpose latest-active` | Product policy qualification of the actual active artifacts and their identities. |
| Independent engine parity | Existing Windows/Linux Jena qualification jobs; locally `node scripts/runRepositoryPython.js -B -m unittest tests.test_ontology_policy_engines -v` with qualified environment | Cross-engine behavior. Missing runtime means not run, never qualification. |
| Distribution/platform/container checks | Existing `archive`, `container`, `assemble` jobs | Actual development distribution boundary; do not substitute a website build. |
| Hosted gate behavior | Actual `pull_request` runs and native ruleset readback | Event permissions, applicable status identity and enforced merge conditions. |
| Generated activation and preservation | Exact local inventory, absence/readback and retained-content comparison | Git diff alone cannot prove ignored activation removal or retained evidence integrity. |

Before invoking local cross-engine tests, the existing native `JenaRuntime.from_environment()` must succeed. Preserve provisioning evidence and do not download or substitute another Jena/JDK version merely to get a passing run. Preserve existing hosted provisioning; report local absence as unavailable rather than silently accepting skipped parity tests.

Use the direct Vite build for checks that must preserve tracked inputs; `npm run build` invokes auto-fixes. Do not execute deployment commands or modify the existing `.venv` merely to prune retired declared dependencies.

For an independent verification pass, execute the accepted evidence on the frozen integrated candidate. A reviewer should specifically examine the publication counterexamples, retained-job failure behavior, preserved event permissions and absence of retired workflow prerequisites. This planning task has not run those checks or claimed their results.

## 7. Exact proposed change and approval scope

Approval should name the accepted revision of this document and the applicable groups below. It need not be requested separately for each ordinary edit inside an already accepted group. Commit, push, GitHub mutation, installation/trust and destruction of existing retained resources remain distinct actions.

### A. Product/configuration changes

| File | Exact proposed change | Behavioral/pipeline impact |
| --- | --- | --- |
| `package.json` | Remove `setup:sdlc`, `setup:sdlc:github`, `sdlc`, `check:sdlc`, `test:sdlc`. | Removes embedded workflow entry points; existing build commands and unrelated scripts/dependencies stay unchanged. |
| `requirements-dev.txt` | Create with retained `PyYAML==6.0.3` and `pip-tools==7.6.1`, with their actual purposes. | Maintains independent development-tool needs without a workflow requirements file. |
| `requirements-sdlc.txt` | Delete after all consumers are updated. | Retires engine-only direct requirements. |
| `requirements.lock.txt` | Regenerate from `requirements.txt` and `requirements-dev.txt`; prune only unused closure, retain other selections. | Changes environment/qualification identity; requires fresh product qualification. |
| `.gitignore` | Preserve report, evidence and unrelated configuration exclusions; update only obsolete explanatory comments if needed. | Keeps current product reports and private evidence out of commits. |
| `.codex/config.toml` | Remove only the SDLC `[agents]` block and SDLC management comments; retain approval/sandbox/network settings and independent MCP blocks. | Ends repository-managed workflow roles without weakening the retained permissions. |
| `.codex/hooks.json` | Remove only the old SDLC Stop entry; delete the file if empty. | Stops invoking a retired engine. Does not register/trust HISEW hooks. |
| `.codex/rules/default.rules` | Retire the three old lifecycle rules after the explicit transition decision. | Removes legacy Issue-state/merge prompt rules; separate host permissions, agent authorization and GitHub controls remain applicable. |
| `.github/workflows/development-checks.yml` | Create replacement Windows/Linux development checks using retained commands and approved applicability. | Preserves useful coverage formerly in SDLC CI. |
| `.github/workflows/ontology-validation.yml` | Preserve product checks, job names, rules and provisioning; update only a demonstrated retired consumer reference if approved. | Keeps current ontology qualification; no new required context. |
| `.github/workflows/verify-universal-ontology-mcp-distribution.yml` | Preserve existing tests, build invocations, archive/container and release contracts. | No new terminal context or release identity change. |
| `.github/workflows/codeql.yml` | Preserve applicable languages, events, permissions and selection. | No language pruning based only on SDLC filenames and no expanded security policy in this removal. |
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

Retire the tracked files under `.sdlc/codex/`, `.sdlc/schemas/` and `.sdlc/skills/`, plus `.sdlc/pipeline-policy.json`, `.sdlc/verification.json` and `.sdlc/skill-policies.json`. Move `.sdlc/PACKAGE_STATUS.json` and `.sdlc/SOURCE_PACKAGE.json` byte-for-byte to `docs/sdlc/archive/PACKAGE_STATUS.json` and `docs/sdlc/archive/SOURCE_PACKAGE.json` under the exact configuration approval. Verify destination bytes before removing active locations. Their original version/status statements describe the historical deployment, not a new release or current activation. This replaces the earlier deletion-only proposal for those two records.

The `.sdlc/dcg/` example/probe files are included only after the native-protection consumer check in SLICE-005. This removes repository copies and test probes, not the installed command-protection provider or its accepted operator configuration.

Remove the following eight generated `.codex/agents/` files, after comparison to their declared source: `principles_reviewer.toml`, `repo_explorer.toml`, `researcher.toml`, `review_maintainability.toml`, `review_operability.toml`, `security_requirements_reviewer.toml`, `test_oracle_reviewer.toml`, `verifier.toml`.

The six retired local skill names are `sdlc-route`, `motivation-to-evidence`, `quality-attribute-scenarios`, `thin-implementation-plan`, `test-driven-development`, `release-readiness`. This is not permission to remove external skills with coincidentally similar names, changed user copies, entire `.agents`/`.claude` directories or installed plugins.

### C. Documentation and historical records

Create `docs/sdlc/README.md` as a historical index, not a surviving workflow manual. Create `docs/development.md` or `docs/policy/README.md` only if needed to preserve useful instructions from retired guides; otherwise use existing owning documentation. Repair affected navigation in `README.md`, `docs/README.md` and `docs/mcp/local-development.md`.

The index must identify the two archived manifests, their original locations, exact pre-removal revision and byte-preservation result, and explain that recorded status/paths are historical. Inspect applicable notices for retained or archived material before deleting copied skill/source notices. Do not modify the product licence or unrelated MCP/fixture notices. If archive placement requires a formatter, documentation or distribution exclusion, record the exact file/setting and obtain its configuration approval; do not permit an automatic formatter to rewrite evidence merely to pass a check.

After current consumers release the manuals or receive a preserved historical reference, retire these generic manuals from the current checkout. No move to HISEW is required:

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

`docs/policy/migration-evidence.md` contains report locations describing real past runs. Preserve those statements and the existing product report default. Document the retained location where necessary to replace a retired guide; historical receipts do not become current by editing documentation.

### D. Remote enforcement: observation only

The original proposal to add four required contexts, enable strict freshness and replace `OWL Differential Analysis` is withdrawn from this removal scope. Preserve current remote settings.

A permitted read may identify required contexts produced only by retired workflows. Record exact names, source app and owning rule plus retained protections. WebVOWL needed a separate decision to remove two such contexts; local deletion did not remove branch protection. A later publication task must inspect actual base/head events and logs, distinguish trusted-base validation from candidate checks, and request only demonstrated obsolete requirement changes. No remote edit, bypass, commit, push or merge is authorized here.

### E. Local activation and retained-resource disposition

Exact generated activation cleanup is part of removal and belongs in the configuration approval inventory. HISEW installation, registration, profiles and host trust are excluded; do not configure or qualify HISEW.

Preserve `.sdlc/runtime` and `.sdlc/tmp` product qualification, publication/recovery, security and prior worktree evidence, including ignore/test-discovery protections. Source retirement does not authorize its disposal. Any later deletion needs exact owners, consumers and verified preservation; Git history does not preserve ignored evidence.

## 8. Dependencies, handoff and recovery

| Slice | Criteria | Depends on | Local result |
| --- | --- | --- | --- |
| SLICE-000 | AC-09/10 | Accepted exact scope and current inventory | Adoption/later-change ownership, activation inventory and preservation |
| SLICE-001 | AC-04/05 | SLICE-000 | Product reports and publication safeguards retain their consumers |
| SLICE-002 | AC-01/02/09 | SLICE-000 | Setup and optional tools work without activation |
| SLICE-003 | AC-06/07 | SLICE-001/002 for integration | Surviving CI/security/tooling and release contracts preserved |
| SLICE-004 | AC-08 | Final commands and retained acceptance rules | Contribution guidance no longer requires the retired method |
| SLICE-005 | AC-02/03/09/10/11 | Consumers updated and exact local approval | Engine/activation removed; unrelated state preserved |
| SLICE-006 | AC-12 and all applicable local criteria | Verified candidate and preservation readback | Uncommitted, unpushed handoff with truthful gaps |

Prepare one coherent local candidate. Slice boundaries do not authorize commits or publication. Existing remote protections remain unchanged, including obsolete required contexts needing a later decision.

If a slice fails, preserve diagnostics and reverse only the task's own specific edits as needed. Never restore unrelated working-tree content, use destructive Git restoration, reinstall the retired engine as a workaround or refresh verification digests to imply success. Hold resources with unresolved ownership/retention. A source diff does not preserve ignored evidence or external settings; verify each independently.

HISEW availability, environment qualification and personal adoption do not affect completion of local removal.

## 9. Open checks and replanning conditions

| Check | Evidence/limit | Next action |
| --- | --- | --- |
| Adoption and later changes | Starting history identified; execution inputs may change | Complete per-path ownership through execution HEAD. |
| Local activation ownership | Prior tasks removed 27 or 28 files; no transferable count | Inventory managed blocks/files/links, retain user edits, verify exact removal. |
| Publication coupling | Product receipts use the legacy directory | Trace producers/validators/consumers and preserve refusal cases. |
| Effective remote controls | Original observation is dated 14 September | Read-only refresh if available; report obsolete contexts or unavailable evidence. |
| Historical evidence | Prior plan recorded retained state and another worktree | Refresh consumers and preserve bytes, paths and protective ignores. |
| Setup and retained tests | This plan update runs no implementation qualification | Run checks on the future candidate; report dependency gaps, skips and failures. |

Replan affected scope if a product needs a retired module, a retained check loses its CI owner, activation contains user changes, publication behavior exceeds approved scope or preservation cannot be verified. Do not expand into HISEW setup, new workflow tooling, dependency modernization, unrelated security policy changes or cross-repository cleanup.

Completion means local repository controls and confirmed generated activation are removed, surviving tooling/checks are preserved, history remains readable and the uncommitted/unpushed result has an honest handoff. HISEW configuration and hosted adoption are not completion criteria.
