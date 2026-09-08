# MCP workspace modernization: implementation plan

**Status:** Design and MCP-CONFIG-01 accepted by Max; baseline merge outstanding. Revision 3,
2026-09-08. Plans the accepted design in
[change dossier revision 8](../specs/2026-09-08-mcp-improvement-change-dossier.md).
Max accepted the local-server scope, maintenance benefits, contributor profile and
native workspace development direction (DEC-001/003/007), then confirmed revision 1:
"This concrete design captures what I want - proceed" (dossier SRC-015). The design,
preservation criteria and slice strategy below are accepted. SRC-016 approves
[MCP-CONFIG-01](2026-09-08-mcp-workspace-configuration-proposal.md) revision 1 and
authorizes Issue creation and baseline capture. [Issue #25](https://github.com/Hadden-Industries/universal-ontology/issues/25)
is published; [snapshot v2](../sdlc/baselines/issue-25/v2.json) matches its approved
body exactly and passes native schema/linkage validation. The failed v1 capture
is retained as encoding evidence. The baseline has not been committed or merged;
the required Git authority and later installation/scan authorities remain separate.

**Purpose:** Preserve exact, provenance-bearing ontology lookup while making MCP
development understandable to a competent JavaScript/Node author new to the repo.
Applicable established practice is a sufficient benefit; measured savings are not
required. Judge the result through both the maintainer path and real ontology
consumers, including the website.

**Route and ownership:** R0 for acceptance recording and baseline preparation; R2 for the
combined HTTP/integration and package changes. Max owns acceptance and scope.
The implementing agent is the integration owner, coordinating all
consumer changes and evidence. No parallel write work is assumed. Apply the
[repository TDD procedure](../../.sdlc/skills/test-driven-development/SKILL.md) once
implementation is authorized; this document contains no implementation.

## 1. Accepted design and its authority

Use three npm workspaces: the existing MCP executable package and two private
shared packages. This applies native dependencies, package-name imports and
workspace scripts to the accepted workflow. It is a repository design judgment,
not a claim that npm prescribes this layout. Dossier SRC-010/012 and EVD-003/005
record the official guidance, conditional approval and actual consumer evidence.

| Predicted owner | Responsibility and consuming interface |
|---|---|
| `packages/universal-ontology-mcp-server` | Own MCP server/tool code, source stdio entry, loopback HTTP composition, focused tests and bundle/verifier tooling. Keep the installed interface CLI-only: the existing `bin` and bundled payload, with no advertised source-module exports. |
| `packages/universal-ontology-query` (private) | Own query execution, query/artifact contracts and repository implementations. Serve MCP, WebMCP and repository artifact construction/staging through explicit exports below. Its name describes query responsibilities, not all ontology behavior. |
| `packages/universal-ontology-projection-policy` (private) | Own release-specific RDF property selection, preservation of historical property assertions and bounded historical-source interpretation. Serve query/index code and website rendering directly. Own the existing projection declaration/schema as a single authored source. |
| Repository root | Own website composition, ontology index/channel production, cross-product verification, installer orchestration and distribution-consumer acceptance. Root npm commands invoke actual workspace operations or compose repository operations where needed. |

The extra shared boundary follows three existing consumers of projection policy:
website rendering, index construction and query resolution. Keeping all that
policy inside a query-named package was considered; it would make website rendering
depend on query ownership for behavior that is not query execution. Neither private
workspace becomes a separately published product. No forwarding modules or generic
ontology/utility package are proposed.

### Query and projection interfaces

These are accepted interface responsibilities. The configuration proposal supplies
concrete export targets checked against current consumers. Export existing capabilities with precise contracts;
do not expose a wildcard source tree or add unused extensibility.

| Query package entry | Existing capability and consumer |
|---|---|
| Root | `createOntologyQueryModule` and domain error identities needed by MCP/WebMCP. The returned search and exact-resolution operations remain the application boundary. |
| `/schemas` | Existing input/output, entity and release-identity schemas/parsers used at actual consuming boundaries. |
| `/artifacts` | Query-index construction, artifact/catalog/channel contracts, canonical bytes, parsing, digest/reference checks and bounds/path rules needed by build/staging consumers. |
| `/repositories/same-origin-fetch` | Existing browser artifact repository; preserve its origin and browser policy. |
| `/repositories/file-system` | Existing Node filesystem repository. |
| `/repositories/persistent-http` | Existing HTTP reader, persistent cache and repository composition for the installed local server. Keep its Node dependencies out of browser imports. |
| `/json-value-immutability` | Move the actual recursive JSON-freezing implementation out of the schema module and give it a precise operation name, such as `freezeJsonValueDeeply`. Expose only the validated acyclic JSON contract required by query artifacts and the WebMCP result. |

The projection-policy root exposes the existing configured property resolvers;
construction seams used only by its tests stay internal. Preserve declaration
meaning, schema IDs and format versions. The website's existing
`/ontology/projection/` URLs and delivered declaration/schema bytes remain stable
through its existing asset-copy/collision checks.

The query root, schemas and browser entry must remain browser-safe. A catch-all
barrel must not pull filesystem, persistent-cache, `Buffer` or Node crypto imports
into the website graph. Preserve error identity across packages. For immutability,
characterize nested parsed inputs and the existing already-frozen-container
precondition before promising more than the implementation supplies. The flat
displayed-release context can use native `Object.freeze`; do not introduce a
general-purpose object-graph API to retain an incidental import.

### Development, executable and metadata ownership

The repository development installation supplies the workspace links and tools.
The MCP workspace declares its directly imported source/build/test requirements as
`devDependencies`: the query package, relevant SDK packages, Zod and actual build/test
tools. Private query source declares its own Zod/projection dependencies normally;
root consumers declare their own direct dependencies. Use npm's supported version
and lockfile mechanisms, not an assumed `workspace:` range syntax.

This distinction follows the executable contract: bundling embeds the required
JavaScript and projection declaration. A fresh tarball installation must run with
Node alone, without resolving private packages or compiling source at installation.
Retain explicit build/`prepack`; no `prepare` or install hook is proposed. Preserve
the existing engine/support boundary pending ordinary supported-version research.

Move actual private consumers with their MCP owner, including the stdio runner,
loopback listener, MCP tests/fixtures and application-bundle verifier. Keep unrelated
GitHub MCP launcher tests at root. The Python installer invokes the moved verifier
as an executable; it does not need a new MCP module export. Root distribution tests
exercise the manifest and installed product instead of importing unshipped private
metadata. Keep their expected two-tool contract independently anchored.

Repository `mcp:dev` composes index generation with the workspace listener. Preserve
accepted arguments/environment behavior deliberately when relocating the existing
`--refresh-index` orchestration. Source path changes are coordinated with consumers;
do not leave forwarding files to disguise unresolved ownership.

The MCP manifest becomes the authority for MCP application identity/version, while
the root retains the website/application identity. Preserve the current MCP identity
and runtime version during this change. Adapt existing cross-artifact and Registry
schema checks; do not add a generator or schema bump without a demonstrated need.
Retain bundle input restrictions, esbuild input evidence, accurate component/SBOM
attribution and full applicable license notices. Relocation proves none of these
automatically. Resolve dependency metadata from its actual owner, not an assumed
root `node_modules` layout.

### Native HTTP ownership with explicit deployment policy

Retain native `serveStdio`, `createMcpHandler`, protocol classification/validation,
stateless legacy handling and JSON terminal responses. The installed/current SDK
2.0.0 already exports `isJsonContentType`; its published release has no configurable
raw-body limit. Later unreleased source is not an available upgrade. Dossier
SRC-009/011/013 and EVD-004/005 record the standards, exact release and authority.

Use native era-specific representation handling and verify normative outcomes
independently. The accepted contract does not require a uniform local `406` or
representation-header rejection before Node JSON parsing. Reuse the native
Content-Type helper if a justified early application check remains. Do not copy a
custom Accept grammar merely to reproduce existing characterization tests.

Preserve explicit 131,072-byte raw-body bounds at Node and standalone Fetch ingress,
Host/Origin/rate/concurrency admission before parsing, eight active requests and
the inherited safe rejection, connection-close, cancellation and shutdown policies.
Each actual ingress owns its raw-byte limit once. Node's supported `parsedBody`
composition can carry a value whose original stream was already bounded; the
standalone Fetch path must still bound its own original stream. Remove redundant
buffering of a reconstructed request only when that ownership is demonstrated.

Characterize unsupported methods as well as POST: current Node conversion can
consume other method bodies without the POST-only local guard. An arbitrary
`parsedBody` is not proof that an original stream was bounded. Preserve application
admission errors separately from native protocol errors. If the released native
behavior fails an accepted normative obligation, record the gap and replan; neither
SDK output nor old snapshots alone settle correctness.

Keep present safe diagnostics. No new protocol-logging feature, resources, prompts,
host-specific Apps interface, hosted MCP endpoint or support removal is selected.
Retain supported Classic Zod use for the fixed domain schemas (dossier SRC-014).

## 2. Slices, dependencies and falsifiable proof

Slice IDs retain the dossier's earlier candidate references; IDs are not execution
order. Accepted sequence: **001 → 002 if independently useful → 005 → 006 → 004 → 003**.
Apply NAM-01 in every slice; slice 002 cannot postpone in-scope semantic corrections.
Every slice includes its actual consumer updates, documentation and proof. HTTP
research and proof design may be read-only independent work; moving MCP files and
changing their behavior are sequential under the integration owner.

| Slice and traceability | Predicted seam/files and independently demonstrable result | Proof, recovery and retention |
|---|---|---|
| SLICE-001 — real semantic transport evidence. REQ/AC-001/002, QA-001, DEC-002 | Existing `tests/mcp` and ontology-query fixtures. Search Person and resolve its exact typed identity using the real query implementation in modern/native-legacy stdio and loopback HTTP. Verify actual era/revision. | Independently record authored definition value/language/datatype, identity and release provenance from immutable fixture sources. Include absent entity and representative protocol/application failure paths. Reuse green tests without artificial RED. Retain fixtures and honest failures; route a discovered defect before repair. |
| SLICE-002 — independently scoped naming corrections. REQ/AC-004, CON-002 | Correct verified ambiguous MCP catalog comments or other independently separable mismatches in source/docs and their actual consumers. Retain genuine SDK, protocol and artifact-version distinctions. | Prose uses review/diff checks; changed identifiers use actual consumer checks. No invented tool-contract version, indiscriminate `v1` replacement or compatibility alias. If inseparable from a moved responsibility, perform the correction in that slice instead. Reverse only task-owned edits if rejected. |
| SLICE-005 — projection-policy consumer path. REQ/AC-001/004/005, QA-003, DEC-003 | Move `src/ontologyProjectionProperties.js`, `src/projection/field-property-history.v1.*` and owned tests into the private workspace; update `src/ontologyViewModel.js`, query/index consumers and website asset composition together. | Existing projection, query-index and built-page tests plus direct checks of delivered declaration/schema identity and bytes. A rendered/query result retains independently expected authored values and historical distinctions. No data migration or second authored copy. Remove old paths only after every consumer is updated. |
| SLICE-006 — query consumer path. REQ/AC-001/002/004/005, QA-001/003, DEC-003 | Move `src/ontologyQuery`, its owned `tests/ontology-query` and worker fixtures into the query workspace. Update MCP, `src/webmcp`, artifact builders and channel staging to the explicit interfaces. Move the JSON-freezing implementation with its real callers. | Real query golden cases, repository/cache cancellation and integrity regressions, WebMCP result/context tests, artifact generation/staging and website build. Verify browser entry graph excludes Node-only modules and cross-package error identity/immutability. Preserve artifact/cache formats and interrupted-cache behavior; no backfill or reconciliation is intended. |
| SLICE-004 — MCP development-to-installation path. REQ/AC-001/002/004/005/006, QA-001/003, DEC-003/005 | Move `src/mcp`, source runners, owned tests, bundle builder/verifier and related tooling into the MCP workspace. Update root scripts, installer caller, metadata consumers, bundle input/component attribution and documentation together. | Workspace source commands and focused tests; real bundle verification; native pack and isolated fresh installation with no private dependency/runtime import; independent Person definition/provenance; unchanged tool/product identity; valid Registry/manifest/SBOM/notices. Root website/query verification remains included. Keep a digest-identified prior local bundle and relocation inventory for recovery; do not claim archive/OCI/host runtime acceptance from fixture tests. |
| SLICE-003 — native HTTP request path. REQ/AC-001/002/003/004, QA-001/002, DEC-004/006 | Change the now-owned HTTP adapter/listener composition to transfer justified representation handling to the native owner and give each real ingress one byte-bound owner. Preserve the standalone Fetch contract. | Real Node socket and Fetch checks: exact limit/limit+1, streamed/declared oversize, unsupported methods, malformed JSON/representation metadata, both eras, admission-before-parse, unread-body connection handling, ninth request rejection, cancellation/shutdown and safe logs. Run the semantic matrix after changes. Abort on weakened bounds, lost outcome or unresolved native conformance; retain failing evidence and use a targeted reverse change or forward fix. |

The query/projection slices preserve the higher website outcome, not merely import
resolution. The MCP slice preserves the executable outcome, not merely source tests.
The HTTP slice preserves explicit policy, not incidental uniform rejection output.

## 3. Verification and review boundaries

Use repository-owned npm commands and inspect lifecycle effects first. The current
test entry is `npm test -- --runInBand --runTestsByPath <actual selected paths>`.
Workspace `test`/`build`/source scripts are proposed configuration, not commands
already available. Keep the repository's required Jest VM-module setup; do not
invent a custom test runner. Shared tooling can remain repository-owned where
appropriate while each workspace exposes its focused operation.

Use the official SDK client/server at the protocol boundary and existing
consumer-owned Zod/Ajv/artifact parsers at their actual boundaries. The semantic
oracle is independently inspected ontology source and provenance, not production
projection code, copied SDK responses or transport equality. Real query execution
is mandatory in the golden matrix; network fixtures may replace external artifact
hosting when their bytes/status/failure contract is explicit. Retain real subprocess,
socket and installed-package checks for the boundaries they claim to cover.

Run focused consumer checks after each slice and the route-required profiles on the
final frozen implementation. Current R2 requires `full`, which includes the checks
from the smaller profiles, JS/Python/SDLC tests, lint/format, ontology invariants,
direct Vite verification, JSON-LD generation and MCP bundling. `npm run build`
auto-fixes tracked inputs; use the documented preserving verification route.
Relevant current commands include `npm run mcp:package:build` and
`npm run mcp:package:pack`; the latter creates a local tarball and is not publication.

Apply [REVIEW.md](../../REVIEW.md) to the exact accepted baseline and frozen diff.
R2 needs independent verification. The cross-product ownership change warrants
maintainability coverage; HTTP lifecycle and bundle/install recovery warrant
operability coverage. Select only actual specialist needs. Native Codex Security
owns any authorized HTTP/security diff assessment; keep correctness/oracle review
distinct, carry forward the SDK embedded-dependency boundary and retain scan gaps.
No live scan or installation is authorized merely by drafting this plan.

Existing named-host, archive and OCI obligations remain where affected. Run them
against the actual artifact/environment before claiming that acceptance. A client
probe, fixture archive or workflow-text assertion cannot substitute for it. This
increment does not initiate publication or a new host/platform support commitment.

## 4. Configuration approval before editing

Root AGENTS.md requires approval of exact files/settings. This inventory maps the
accepted design to configuration responsibilities. The separate
[MCP-CONFIG-01 proposal](2026-09-08-mcp-workspace-configuration-proposal.md) gives the
exact manifest entries, script bodies, exports, lockfile operation and coverage
settings approved by Max in SRC-016. Apply that exact scope after the baseline
merge gate; this inventory grants no additional setting changes.

| File | Smallest intended settings/change and effect |
|---|---|
| `package.json` | Extend explicit `workspaces` with the two private paths; declare root direct consumers and remove MCP-only root dependencies after tracing them; route MCP source/build commands to their owner; compose index generation for `mcp:dev`; extend `lint:js`, `format`, `format:check` and `fix:all` to all new package JS/data/docs. Preserve root verification entry points. |
| `packages/universal-ontology-mcp-server/package.json` | Add actual source/build/test `devDependencies` and focused scripts; update `prepack` to the owned builder. Retain executable identity/version, `bin`, packed-file contract and no installed private dependencies. No source `exports` or new install hooks. |
| `packages/universal-ontology-query/package.json` (new) | Exact private ESM identity/version, explicit browser-safe/domain/Node exports, direct dependencies and focused test script. No publication surface. |
| `packages/universal-ontology-projection-policy/package.json` (new) | Exact private ESM identity/version, configured resolver entry and actual data/build consumption entries, direct dependencies if any and focused tests. Preserve asset identity. |
| `package-lock.json` | Native npm regeneration for the approved manifests, reviewed for exact graph/integrity and unintended version/lifecycle changes. No speculative dependency update. |
| `eslint.config.js` | Extend common JS coverage and appropriate Node-specific overrides to the moved source/tools/tests; retain browser restrictions. |
| `scripts/selectPullRequestChecks.js` | Route shared package changes to both affected website/query and MCP/distribution checks; update obsolete source-path routing without reducing coverage. |
| `scripts/build/createWebsiteConfig.js` | Update the existing copy source for relocated projection declaration/schema while preserving output URLs and collision enforcement. |
| Bundle build configuration within the moved `buildUniversalOntologyMcpApplicationBundle.js` | Update source entry/input allowlists, asset inputs and actual-owner dependency metadata resolution; preserve output payload and component/notice/SBOM controls. Present these settings with the relocation. |

No SDLC version/status, Registry identity, Docker payload or publishing/workflow
change is presumed necessary. If an actual consumer requires another configuration
change, prepare its exact minimal proposal and effect before editing it. Workspace
test discovery and root checks must be demonstrated; add a further configuration
proposal only if the existing discovery cannot include the moved tests correctly.

## 5. Compatibility, observability and recovery

No ontology release, query-index/cache format, schema identity, artifact URL or
authored-data change is intended. Compare before/after artifact identities and
website projection assets with the same inputs. An unexpected difference requires
explanation and contract review, not automatic fixture regeneration. Retain existing
cache atomicity, interruption/resumption and failure evidence. A new format/backfill
need is a material design change.

Before each relocation, record task-owned old/new paths and actual consumers.
Keep the last verified bundle identity and applicable local evidence until the new
source and installed-artifact paths pass. The implementing agent observes tests,
builds and existing safe operational events; Max observes any authorized host
acceptance. On failure, stop promotion/installation, retain the evidence, and either
reverse only this task's specific edits or make a reviewed forward fix. Never use a
Git restoration command to discard other work. Restoring a prior installed artifact
requires its verified identity and the relevant installation authority; recovery
has not been exercised by this draft.

The maintenance walkthrough starts at the MCP workspace, finds transport setup,
traces `search_entities`/`resolve_entity` through the query interface, and identifies
focused versus repository-wide SDK-update checks and rights review. Documentation
and reviewer observations should answer those questions without private conventions.
Report them as a walkthrough, not a measured onboarding study. Operational evidence
uses existing safe event/error codes; never log query text, definitions, identifiers
or local paths to manufacture an improvement measure.

Retain independent golden fixtures, meaningful failure evidence and needed recovery
artifacts. Remove spent task-owned copies/build scratch only after checking consumers
and retention. The raw advisory review remains unchanged as historical source.

## 6. Acceptance and replanning

Max confirmed the concrete shared ownership, native HTTP direction and preservation
criteria in SRC-015. Do not reopen that design interview. The
[approved Issue body](../specs/2026-09-08-mcp-workspace-modernization-issue-body.md)
places normative requirements and decisions directly in Issue #25 and snapshot v2.
The official npm/Node and released SDK capability checks are documented;
packing, browser-graph, socket, rights/integration and recovery claims still require
their actual evidence during the authorized implementation. Before execution,
refresh current stable/applicable LTS and exact rights under REU-01/VER-01/LIC-01;
do not treat unversioned SDK docs or a package's short license label as clearance.

The actual accepted Issue and native snapshot now exist. Use
[v2 and its capture evidence](../sdlc/baselines/issue-25/README.md); v1 is unusable.
Obtain the required Git authority and merge the protected baseline before R2
implementation. The baseline-only PR must contain only Issue #25's baseline
directory; publish the advisory/dossier/plan/configuration documents separately.
Keep configuration, commit, push, installation/trust and live-scan approvals within
their exact scope. No approval or no-shim exception is inferred from a passing
helper. SRC-015 accepts the design; SRC-016 supplies configuration/publication/
capture authority; native validation establishes document integrity, not a merge.

Replan/rebaseline if real evidence requires a new support obligation, weakens
admission or standalone Fetch coverage, changes ontology/cache formats, exposes
Node code to browser consumers, breaks the self-contained CLI, changes rights or
SDK reachability, or contradicts the unfamiliar-maintainer outcome. For each such
case the integration owner records the failing example, affected contract and
smallest discriminating check; Max decides a consequential scope/contract change.
Routine implementation choices within the accepted design need no new interview.
