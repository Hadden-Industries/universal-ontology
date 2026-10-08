# MCP workspace modernization execution record

Owner: Codex task `UO: Modernize MCP`; accountable owner Max.
Starting revision: `59878da5485fa75b7f2f63410574d2b0fa72381a`.
Continuation base: `79d187802f9255134c03d0786ff75181ed1070ee`, incorporating the
separately merged Windows SDLC repair without changing the frozen projection diff.
Accepted intent: [Issue #25](https://github.com/Hadden-Industries/universal-ontology/issues/25),
[baseline v2](../sdlc/baselines/issue-25/v2.json), and the
[accepted implementation plan](../plans/2026-09-08-mcp-workspace-modernization.md).
The two planning PRs are merged and the Issue is `state:accepted`; historical
pre-merge statements in the captured design do not describe current lifecycle state.

## SLICE-001: real semantic transport evidence

Route: R2, preservation of existing behavior under the repository-adapted TDD
verification routes. Traceability: REQ/AC-001/002, QA-001, DEC-002. The purpose is
to protect exact authored ontology lookup while ownership and HTTP composition
change. A passing protocol exchange or two identical stubs cannot establish that
outcome. No artificial RED is required for an already satisfied requirement.

The independent oracle is the existing RDF/XML
`tests/fixtures/ontology-query/minimal-ontology-release`, SHA-256
`efbb5401bbe45464f916875b81777c9132fac63f56c8d34b0b3af27601aa163b`.
Its Person class has an en-GB preferred label and definition, a separate untagged
`xsd:string` definition, an entity-level source, and a different definition-level
source carried by `owl:Axiom`. Expected values are literal assertions derived from
that source, not values calculated by query/projection code. The test proves source
identity before generating artifacts and exercises actual projection, filesystem
artifact reading, query execution, tool serialization and official client parsing.

Required matrix: modern pinned `2026-07-28` and native legacy `2025-11-25`, each over
the source stdio process and real loopback HTTP sockets. Check actual negotiated
era/revision, Person search, exact typed resolution, missing entity, a safe query
failure and invalid tool parameters. Application errors remain distinct from
protocol failures. Search and resolution must each match the independent oracle;
transport agreement alone is insufficient.

Initial preservation evidence: the unchanged stdio and socket integration suites
passed 26/26 tests on the starting revision. Native npm 12.0.2 ran the repository
`test` entry with `--runInBand --runTestsByPath` and those two actual suite paths.
The first modern HTTP semantic case passed. Expanding to all four transport/era
combinations preserved Person semantics in 4/4 cases. The four error scenarios
initially failed because the draft test expected the generic default error message;
the existing query module deliberately includes the requested public release ID.
The accepted contract and existing query tests require the domain code,
non-retryability and safe output, not that default wording. The draft now uses the
consumer schema plus those contract assertions and the private-path prohibition.
No product behavior or accepted oracle changed. Retain the original failed output
in `.sdlc/runtime/mcp-modernization/semantic-matrix-first.log`; it is not a product
defect or behavioral RED.
The next run exposed a second draft-fixture mismatch: whitespace `queryText` is
invalid tool input inside a valid protocol request, which the existing SDK/server
test already expects as an `isError` tool result. The matrix now checks that result
and separately sends a non-object `arguments` member to test protocol `-32602`.
This preserves the distinction in the
[MCP tool error contract](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling).
The second failed log is `semantic-matrix-corrected.log`; no product code changed.

The final matrix passed 8/8 tests (`semantic-matrix-green.log`). A disposable
negative-control worktree at the starting revision ran that same test while
discarding lexical assertion annotations in the real query-index builder. All
four transport/era semantic cases failed at the missing definition-level source;
the four error cases passed. This is observed sensitivity to lost provenance,
not an import/setup failure (`semantic-provenance-negative-control.log`). The
candidate's MCP/query regressions then passed 19 suites, 357 tests, with one
existing skipped test (`semantic-affected-regressions.log`). The native focused
SDLC profile passed. Final R2 verification still requires the configured `full`
profile and independent verification.

## SLICE-002: precise existing names

REQ/AC-004, CON-002; prose/mechanical verification route. The catalog comments
now identify the search and resolution tools without inventing a `v1` tool
contract. The stdio integration suite identifies the source process it actually
launches. Genuine protocol and query/cache format versions remain meaningful.
No runtime identifier or externally visible tool name changed.

## SLICE-005: projection-policy ownership

REQ/AC-001/004/005, QA-003, DEC-003; preservation route for the implementation
and authored assets, test-first for the new asset collision and PR routing paths.
The unchanged projection/build/built-page/PR suites passed 88/88 tests before
relocation (`projection-preservation-baseline.log`). The public outcome is the
same authored ontology values and historical distinctions in browser and query
consumers, with explicit package ownership that other authors can understand.

The implementation, declaration/schema and 36 existing policy tests now live in
`packages/universal-ontology-projection-policy`. Its public root exposes the
three configured resolvers; constructors remain internal. Website and query/index
callers import the package directly. Vite resolves the actual package data exports
and retains the existing public paths, copy controls and output collision checks.
The built-page fixture uses this real package and checks HTTP-delivered bytes
against the pre-move source hashes, alongside rendered values and CSV results:

| Asset at `/ontology/projection/` | SHA-256 before and after the move |
|---|---|
| `field-property-history.v1.json` | `abd590e4528c0d2c3005d7868d59d154428a34cf831e8a04a9be735b2d10cbcd` |
| `field-property-history.v1.schema.json` | `4f0359c0eb58e2d901bf96c28cc44e0323a5600fab2bda8c2017a52a6e4eb82a` |

Before consumer implementation, five native Git routing cases failed because
the future package selected none of its three product consumers; two real Vite
cases failed because a conflicting policy asset was accepted. All 49 neighbouring
tests passed. Retain `projection-consumer-red.log` and the actual pre-change test
diff `projection-consumer-red.diff`; these are the intended behavioural RED.

MCP-CONFIG-01 is applied only through this consumer-complete stage: projection
manifest/link, explicit dependency ownership, existing-directory coverage globs,
ESLint source/test coverage, PR routing, Vite assets and the projection paths in
the current bundle allowlist. Applying that already approved bundle path subset
now is necessary to keep its actual consumer working; moving the builder itself
remains SLICE-004. No future query workspace or package-script path is referenced.
Native lock regeneration changed only root ownership and the new workspace/link;
every external version, resolved artifact and integrity entry is unchanged.
Native offline installation linked the development workspace. The workspace's
own test command passed 36/36; root native Jest discovery finds the moved suite
at its actual package path. The post-move affected run passed 31 suites, 496 tests,
with one existing skipped test (`projection-affected-green.log`), including the
seven intended RED cases, rendered browser values and delivered policy hashes.
`npm run lint:js` also passed with the approved workspace globs. The unused bundle
filename in that pattern-based affected command matched no suite; it supplies no
distribution evidence. The required full profile runs all actual distribution
suites and the actual bundle command.

The first full profile reached all 53 JavaScript suites: 743 tests passed, one
was skipped, and two distribution manifest assertions failed because they still
required the previous single-workspace array. The approved MCP-CONFIG-01 stage
requires the new private workspace. Those two expected arrays now retain exact
checking of the approved two-workspace graph; public package contents, version,
lifecycle and dependency assertions are preserved. Their names now identify the
root build-toolchain owner and distinguish ontology artifacts from bundled policy
data. Retain `full-verification-first.log` and native run
`04792dd937154b1b814e7ea0e9ba04f6.json` as failed evidence. Later profile controls
were not run in that failed attempt.
After that correction, the actual npm-package and bundle-verifier suites passed
12/12 tests (`projection-distribution-green.log`), including local tarball
installation in disposable fixtures. Formatting of the changed suite also passed.

The final frozen checkpoint uses `npm run sdlc -- verify` with the active R2
baseline. Its raw command output is retained as `full-verification.log`; native
records under `.sdlc/runtime/verification` and `.sdlc/runtime/runs` bind results to
the complete tracked/untracked workspace fingerprint. The mutable local handoff
at `.sdlc/runtime/mcp-modernization/checkpoint.md` records the final run identity,
actual result, browser observation and any gaps after execution. This document
does not pre-claim the outcome of that final run.

The first projection ownership plateau was paused as Max requested. At that
checkpoint SLICE-006, SLICE-004 and SLICE-003 were unimplemented, and independent
verification and maintainability review were pending. The continuation below
records the later evidence and work without changing that original chronology.

Modern-web-guidance 0.0.187 was resolved from the registry, with its exact Apache
license and bundled notices inspected, before its pinned search ran. The query
about module imports/static assets returned no applicable ownership guidance;
the accepted native npm/Node/Vite design remains the basis for this move. Its
skill-version update notice is retained, with no skill/config update inferred.

## Projection review and continuation

Max subsequently authorized the two read-only reviewers. Both inspected the
unchanged projection snapshot at `79d1878`. The verifier independently parsed the
authored fixture with RDFLib, checked the public package and its native schema,
ran 36 workspace tests and the full R2 profile, and reran the provenance negative
control. Native full verification passed all 11 commands: 745 JavaScript tests
passed with one platform skip, Python ran 113 tests with one platform skip, and
93 SDLC tests passed. The source, browser and distribution consumers passed.
The negative control again failed at all four expected provenance assertions
while its four safe-error cases passed. The maintainability reviewer reported
no actionable finding in SLICE-001/002/005; no new functional or NAM-01 discrepancy
was established by the verifier.

The two original reports were assessed after both returned. The native run is
`8d364f5f14dd4babadfaeb179b820d35.json`, SHA-256
`cba19d362b3f557b4baaa54570b6daef1d433f4b5e1e06379273a27bef148b2f`, with unchanged
workspace fingerprint
`678f04eaa9cd3dc11bc28d0f3c9d50e368296d3fd867ba11635feb88d6c52a6b`.
Original reports and raw logs remain in the task runtime and dedicated projection
verification checkout; the checkpoint records their locations. These are local
evidence records, not attestations or human release approval.

Both reviewers identified the inherited incomplete SDK notices (G-01): delivered
MIT labels do not reproduce the inspected transition/documentation terms. Carry
accurate full notices and content-sensitive packaged-artifact checks into the
already accepted SLICE-004. That slice also retains the stronger installed Person
definition/provenance oracle; the current installed fixture establishes narrower
identity/lookup and bundle-independence evidence. Neither gap is waived by the
projection result. Existing host, platform and security limits remain explicit.

## SLICE-006: query ownership

Route: preservation under the accepted plan and repository TDD verification
routes, with characterization of JSON-freezing preconditions and test-first
native PR routing. Traceability: REQ/AC-001/002/004/005, QA-001/003, DEC-003.
Native `sdlc resume` preserved the prior state and recorded Max's continuation
authority in task `6ea3bf087d354304a6b38952494de58c`.

The actual 17 query implementation modules moved into
`packages/universal-ontology-query/src`. The package owns its existing query
tests and the two persistent-cache worker fixtures. Shared RDF/build/HTTP fixture
support remains with the repository. Moved tests resolve those inputs from the
real repository location and run from their package's working directory.

The accepted package root exposes query execution and the single domain-error
identity. Explicit schema, artifact, same-origin fetch, filesystem and persistent
HTTP entries serve their current consumers. Node-only implementations remain
outside browser entries. The recursive implementation moved from the schema
module to `jsonValueImmutability.js` as `freezeJsonValueDeeply`; its validated,
acyclic JSON and already-frozen-descendant preconditions are explicit. The flat
displayed-release context uses native `Object.freeze`. No old-path forwarder,
general graph utility, duplicate error class or additional package is introduced.

MCP, WebMCP, artifact construction/staging, shared fixture builders and distribution
tests use the declared entries. The isolated built-page fixture consumes the actual
package instead of copying query source modules. MCP-CONFIG-01 supplies the exact
query manifest, root workspace/dependency, ESLint runtime selection, PR selectors
and bundle-input prefix. Native npm 12.0.2 updated ownership/link records only;
external versions, resolved artifacts and integrities are unchanged. Root MCP
SDK/build dependencies and commands remain until their owner moves in SLICE-004.

Before the move, the two new nested-JSON/pre-frozen-container checks passed against
the actual old `deepFreeze` implementation. Four native-Git routing cases failed
because query package source, manifest, tests and worker-fixture changes selected
none of their three required consumers; 52 neighbouring/characterization cases
passed. Those exact routing cases now pass. The new public-interface checks are
preservation evidence added with the extraction, not claimed pre-change RED.

The moved workspace passed all 238 applicable tests in 11 suites, retaining one
Windows-inapplicable skip. Root discovery includes all moved suites. Real MCP
semantic transport checks and safe failures passed through the package. The public
artifact entry raises the same `OntologyQueryError` identity exported at the root.
The browser check demands all exports from the four browser entry points, including
exports that a particular website import might otherwise eliminate, and checks
the native bundle graph for Node repositories/builtins or externalized modules.
Its observed positive build has one entry chunk and 34 modules.

The first graph-test draft called Vite inside Jest's VM and failed at the native
Rolldown plugin binding, before a product graph was built. It now follows the
existing native Node subprocess pattern. No package, version, transform, validator
or test threshold was changed to accommodate that harness failure. Both interface
tests then passed. The supported [Vite JavaScript build API](https://vite.dev/guide/api-javascript.html#build)
and [library build options](https://vite.dev/config/build-options.html#build-lib)
were checked against the current primary documentation; no configuration file
was introduced for these fixtures.

A deliberate control bundled the real Node-only persistent-HTTP entry for a
browser, without changing production source or writing outputs. Build alone
returned success with Node-externalization warnings. Applying the same graph
condition used by the maintained test correctly failed on
`__vite-browser-external`. Both attempts are retained; build success alone is
not evidence of this boundary. Existing provenance sensitivity evidence remains
separate from this package-boundary control.

The query source comparison against the independently verified projection copy
contains the explicit entries, moved/renamed freezing operation and its imports;
repository/cache algorithms, schemas, canonical bytes and safe errors are
preserved. No format migration, cache reconciliation or unrelated bug repair is
part of this slice. The first full attempt passed 55 JavaScript suites (752 tests
passed, one platform skip), Python, SDLC and lint, then stopped on line wrapping
after a final test-variable rename. The native formatter corrected that file;
the failed run remains retained. Final native full-profile and independent results for this
updated target are recorded in the task checkpoint after execution, not inferred
from the earlier projection result. The next pause is the query ownership plateau.

### Query review findings and correction

Both independent original reports were collected before further authored edits.
The maintainability review found that changes confined to either new browser-test
helper did not select a PR verification scope. Two native Git regression cases,
using the real helper bytes, reproduced `product_tests=false` where AC-005 requires
`true`. Both failed at that exact routing expectation. The helpers now live under
the existing `tests/fixtures/ontology-query` coverage; the browser test and runner
use their actual new paths. The expected scope is unchanged, and no configuration
or selector algorithm changed for this correction. The original snapshots, RED
test input and failed output remain retained; final correction evidence belongs
in the runtime checkpoint.

Independent verification also recorded one intermittent cold-cache worker failure
with `OntologyQueryArtifactCacheInitializationError`. An isolated replay and a
single full replay passed on identical inputs, but the worker's diagnostic omits
the initialization class's safe code and cause. The cache implementation and error
class were byte-identical moves. At that checkpoint the cause remained
unestablished; passing replays did not repair or waive the observation. The
original verifier report and both native results remain retained. Max subsequently
directed continuation through routine checks without pausing at a non-decision.

### F-01: concurrent cache initialization repair

Route: test-first causal repair of the existing shared-cache contract, within
REQ/AC-002 and QA-003 preservation. This restores reliable concurrent use of the
existing local server; it adds no cache format or protocol. Native resume recorded
the continuation authority in task `894311c537324f0e954d0177bfb488a9`.

The unchanged real two-process HTTP test failed again on repetition 3 with the
same initialization class and worker diagnostic. A task-owned diagnostic harness
then reduced the input to two actual processes initializing the same cache,
without HTTP, catalog parsing or RDF. On attempt 12 it captured
`UNSAFE_CACHE_DIRECTORY`, caused by native `lstat` returning `ENOENT` for a peer's
completed `capability-probe-...-linked` file. Directory enumeration had observed
that file before its owner removed it. The production cache source at this point
and the pre-relocation source in the projection verification copy had the same
SHA-256, `f665297ff251a5eb8d3cfade232f6bbfa485c5fec3f4b8d0bb9db19b0520dbfd`.
This establishes an inherited implementation defect and a matching reproduced
failure; the original first failure did not retain enough cause detail to identify
its exact interleaving retrospectively.

The maintained regression uses two real cache instances and the existing
filesystem dependency solely to schedule native I/O. It proves the owner's linked
probe is present in the observer's directory result and on disk, permits the owner
to remove exactly its own three completed probe files, proves the linked path is
now absent, then returns that actual earlier directory observation. Initialization
and subsequent installation/readback must succeed. This failed against the old
implementation at the observed `lstat` boundary. A neighbouring case preserves
fatal, path-redacted handling of metadata permission errors: only `EACCES` is
injected for a file whose actual existence is asserted, avoiding Windows ACL
mutation. It passed before the repair and is not claimed as RED.

`verifyManagedTree` now uses the existing `readStatsIfPresent` for each enumerated
entry. That operation treats only `ENOENT` as absence; every remaining entry still
receives the existing type, ownership and symbolic-link checks, and other I/O
errors remain fatal. No retry, alternate cache, format migration, shadow validator
or compatibility shim is introduced. The retained names describe the same tree
verification and metadata-reading responsibilities.

The two affected suites passed 68 tests with one existing Windows skip. The
minimal native diagnostic completed 100 pairs of concurrent process starts, and
the unchanged real HTTP concurrency case passed ten consecutive repetitions.
These bounded runs support the specific repair, not universal concurrency safety.
The raw RED, cause-bearing reproduction and GREEN logs, old source and RED test
bytes remain under `.sdlc/runtime/mcp-modernization`; the checkpoint records exact
identities and independent follow-up. No diagnostic instrumentation entered the
authored source or maintained worker fixtures. Fresh final R2 verification is
still required after the remaining relevant implementation changes.

Independent review found no actionable functional or naming defect in the repair.
Its first full R2 run passed the functional suites, then rejected two direct
cleanup-guard throws under the existing `no-unsafe-finally` lint rule. The guards
now validate the same constant absolute temporary paths before each test body;
the finally blocks clean only those verified paths. Production source, regression
scheduling and outcome assertions are unchanged. Preserve the original failed
run and report; corrected-target evidence is recorded separately in the checkpoint.
The parent's redirected run additionally failed while printing the lint diagnostic
through Python's Windows charmap, before writing a native record. The subsequent
invocation uses the verifier's supported `PYTHONUTF8=1` process setting; no SDLC or
environment configuration file is changed. That output limitation remains explicit.

## SLICE-004: workspace ownership through installed consumption

Route: R2 preservation, with test-first corrections where the relocation exposed
an invalid ownership assumption. Traceability: REQ/AC-001/002/004/005/006,
QA-001/003, DEC-003/005. The MCP workspace now owns its implementation, listener,
stdio runner, bundle builder/verifier and tests. Root development orchestration
owns query-index generation and passes its parsed configuration to the listener.
Old source paths have no forwarding modules. The maintainer walkthrough is in
`docs/mcp/local-development.md`; shared query fixtures remain repository-owned.

MCP-CONFIG-01's remaining approved manifest, lock, lint and routing changes are
applied. Native npm lock regeneration changed ownership/workspace links without
changing an external version, resolved URL or integrity. MCP-CONFIG-02 changes
only the three approved workflow candidate-version expressions, making the MCP
manifest the software-version authority and retaining the root npm authority.
MCP-CONFIG-03 updates the verifier's single approved workflow-policy digest to
`a8b2e426ced4d7d00f12df81ab948de2fd2c332a3254232fcbef8529d09a4da7`.
The exact configuration addenda preserve their separate approvals.

The builder uses Node 24's native `findPackageJSON` to identify each actual bundle
input's owning manifest, including SDK exports that hide package metadata. Native
real paths and containment checks retain the input boundary. Matching component
identities from multiple physical installations are deduplicated; conflicting
identities are rejected. A real nested SDK/shared-Zod build uses intentionally
different unused root metadata, verifies actual input locations, and executes the
bundle's version command. Before repair, that test exposed the root-only Ajv
assumption and then the rejection of identical components in multiple locations.

Complete installed SDK and Zod licence texts and the five exact embedded
component licence texts now accompany the notices. Exact native `npm pack`
archives and identities are retained under the task runtime for rights review;
their lifecycle scripts were not run. The SDK's short metadata licence label does
not replace its full terms or remove the existing embedded fast-uri restriction.
The public tarball still contains only its five intended files and installs with
no runtime dependency packages. Its actual stdio client now checks Person's
definition values, language/datatype, entity source, distinct axiom source and
superclass against independent source-fixture expectations.

The release verifier now names and checks the native npm SBOM's actual contract:
`verifyIndependentNpmInstalledDependencyContract`. The unchanged workflow command
reports workspace development dependencies as well as package identity; those
are not all installed runtime dependencies. The verifier checks declared native
development relationships and rejects runtime edges at the public package.
Existing independent checks still validate the shipped bundle's eight-component
SBOM. A real npm SBOM failed the old assumption before repair; an injected runtime
edge remains rejected. Five workflow scenarios execute the actual metadata step,
including independent root/MCP versions and the retained Registry/toolchain guards.

Owned evidence under `.sdlc/runtime/mcp-modernization` includes
`mcp-nested-attribution-and-notices-red.log`,
`mcp-nested-shared-dependency-red.log`, `mcp-native-npm-sbom-red.log`,
`mcp-package-and-release-consumers-green.log` and
`mcp-development-preservation-green.log`. Draft fixture failures are retained
separately: omitted default ontology families and an incorrect draft `resolved`
status were corrected to the existing fixture/schema contracts. Those failures
are not presented as behavioural RED or as production repairs.

## SLICE-003: one body-bound owner per HTTP ingress

Route: R2 test-first and preservation. Traceability: REQ/AC-001/002/003/004,
QA-001/002, DEC-004/006. `universalOntologyMcpHttpHandlers.js` distinguishes the
native protocol composition from the standalone Fetch ingress. The real Node
listener applies its existing raw-byte bound once and supplies its parsed body
to the native bridge. Standalone Fetch retains its own byte-bound reader and
does not accept an unrelated caller-provided `parsedBody` as a substitute for
validating the original request. Custom Accept parsing is removed; the official
SDK owns its supported protocol-era representation behaviour.

New RED evidence exercises malformed Fetch bytes with a valid unrelated parsed
body and an unsupported Node method whose stream the converter previously read.
The listener now rejects that method before conversion and closes the unread-body
connection. Exact 131,072-byte and 131,073-byte streamed requests exercise both
real Node sockets and standalone Fetch, including multibyte UTF-8 and an oversized
Fetch stream that must be cancelled before EOF. Existing Host/Origin admission,
rate/concurrency limits, cancellation, shutdown, redaction and the real semantic
transport matrix remain in scope. Native modern and legacy Accept behaviour is
checked separately; client obligations are not recast as a uniform local 406 rule.

Pre-change source/test bytes are retained as `pre-native-http-*.txt`.
`native-http-ownership-red.log` and
`native-http-unsupported-body-read-red.log` preserve the observed failures.
After the final changes, `mcp-integrated-focused-checks.log` records 21 suites and
296 passing tests across workspace, distribution, development and routing checks.
`git diff --check` also passed. These focused results do not replace the pending
full native verification and independent review of the consolidated snapshot.

## Consolidated verification and process observation

Earlier query/full verification records apply to their recorded snapshots. Freeze
the complete current diff plus untracked implementation inputs for the final full
run and existing independent reviewers; retain their native records and original
reports in ignored runtime evidence. Do not edit this narrative after verification
merely to repeat the native run's results and thereby invalidate its fingerprint.
HTTP lifecycle and bundle/install recovery belong in this combined review. Native
Codex Security, named-host installation and release/publication remain separate
authority and evidence boundaries.

Max identified disproportionate execution: repeated routine pauses and separately
discovered coupled configuration changes slowed the accepted work. The R2 route
remains appropriate; apply it with one consolidated final verification/review cycle,
reuse approvals and unchanged evidence, and escalate only actual decisions.
The parallel-execution proposal is a separate proposed item in the main checkout,
`docs/specs/2026-09-09-parallel-sdlc-execution-proposal.md`; no SDLC implementation
is part of this diff. The separately approved encoding report is filed as
[Issue #32](https://github.com/Hadden-Industries/universal-ontology/issues/32).
Only invocation-local `PYTHONUTF8=1` is used here; the SDLC bug is not repaired.

## Review corrections and MCP-CONFIG-04 decision

Both parent and independent full runs passed all eleven controls on manifest
`73f151cc6d5bf3f830517fc0a9a498d2e412d64c1021199ffde30ca7dcb762d0`:
57 JavaScript suites, 771 passed/one skipped; Python 112 passed/one skipped;
SDLC 93 passed. Their native records and original reports are retained in the
task runtime and the separate `mcp-final-verification` copy. The maintainability
review nevertheless found two concrete gaps in those tests. Preserve both facts;
those full passes do not establish correctness of the newly exposed boundaries
or describe subsequent corrections.

**M-003-01:** the new early `/mcp` method rejection lacked `Allow`. The actual
socket regression failed with an undefined field, then passed with the single
native `response.setHeader("allow", "POST")` addition. The response still closes
the connection without invoking the body iterator. All 39 affected HTTP/socket
tests passed. This corrects the changed route's obligation under
[RFC 9110](https://httpwg.org/specs/rfc9110.html#status.405), without transferring
body reading back to the SDK. Source/configuration before this correction remains
in the frozen independent copy and original review manifest.

**M-004-01 / proposed MCP-CONFIG-04:** change only root `package.json`,
`scripts["mcp:stdio"]`, from:

```text
npm run stdio --workspace universal-ontology-mcp-server --
```

to:

```text
node packages/universal-ontology-mcp-server/scripts/runUniversalOntologyMcpStdioServer.js
```

Status: **approved and applied on 2026-09-11**. Max explicitly approved
MCP-CONFIG-04 and one native security diff scan after final verification in
thread `01a091cd-6531-7550-8668-f18a3d971a07`. Only the proposed root script
setting is changed. Earlier RED and candidate GREEN evidence remains historical;
fresh actual-command and final verification results belong in retained runtime records.

The root command then executes the actual workspace-owned entry while keeping
the root package's working directory. Native npm workspace delegation executes
inside that workspace, changing the existing meaning of default and relative
artifact paths; see [npm's run contract](https://docs.npmjs.com/cli/v12/commands/npm-run/#description).
The direct root invocation preserves that contract even when npm is invoked from
a repository subdirectory. No parser fallback, environment-dependent path
reinterpretation or forwarding source module is needed. The explicit workspace
command retains npm's workspace working directory; the installed CLI retains its
caller-selected directory. This one setting changes no dependencies, lockfile,
package version, public artifact, workflow, or validation profile.

The maintained `tests/build/ontology-mcp-stdio-development.test.js` copies the
actual manifests and MCP source into an owned fixture, provides source-identified
query artifacts, invokes the real root npm command, and uses the official client
and query schema to verify Person lookup. Against the current setting, default,
explicit relative, and environment-relative/subdirectory cases fail; the absolute
path control passes. A temporary candidate changes only this script value in its
fixture manifest and passes all four cases. The actual root manifest is unchanged.
Raw evidence is `root-stdio-working-directory-red.log`,
`root-stdio-working-directory-diagnostic-red.log`, and
`root-stdio-working-directory-candidate-green.log`. The executable candidate was
archived as `root-stdio-working-directory-candidate-test.txt` in ignored runtime;
it is not an extra maintained test or part of future test discovery.

After exact approval, apply the one setting, verify the corrected actual command,
and consolidate final checks and the existing reviewers' correction addenda.
Native Codex Security assessment of the resulting frozen MCP change is also a
separate authorization boundary under `AGENTS.md` and `docs/sdlc/codex-security.md`;
the already known HTTP/input, filesystem/cache, bundle and workflow scope should
be presented together with the command correction decision. No live scan or
configuration approval is inferred from this record.

## Environment, authority and retention

Work is isolated in `.sdlc/runtime/worktrees/mcp-workspace-modernization` on
`feat/mcp-workspace-modernization`; the original index/worktree is preserved.
Node 24.20.0 matches `.node-version`. Initial commands used the previously
installed npm 12.0.2 from the task cache because PATH resolved 11.19.0. Max then
updated global npm; a fresh shell confirmed 12.0.2, and subsequent commands use
that global executable. Native
`npm ci --ignore-scripts --no-audit --no-fund` installed the unchanged locked
development graph in this isolated worktree; it reported a glob 10.5.0 deprecation.
The approved native lock-update command's automatic audit also reported one high
severity vulnerability. No audit repair, dependency upgrade or clean-security
claim follows from this aggregate notice; the external graph was unchanged.
No dependency repair is inferred from successful installation. The worktree's
`.venv` is a directory junction to the existing repository environment; Python
dependencies were not changed. No product installation occurred.
The later distribution suites install the local MCP tarball only in their owned
disposable fixtures. They do not adopt the product in Max's application environment.

Registry refresh on 2026-09-09 local date still selected SDK client/server 2.0.0
and Jest 30.5.1. The fresh SDK LICENSE bytes equal the previously inspected copies,
SHA-256 `0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a`.
Reuse dossier SRC-011/014 and the adoption record's rights/reachability restrictions;
the registry's short MIT label is not the complete SDK license. This slice adds
no untrusted JSON-schema ingress, elicitation or new software component.

The accepted MCP-CONFIG-01 scope remains reusable for its later consumer-complete
slices. No commit, push, native Codex Security scan, publication or deployment
follows from test execution. A dynamic PowerShell move command was rejected by
DCG before execution; inspected literal paths succeeded through the same native
PowerShell boundary. A heredoc-based lock comparison was also rejected before
execution; the ordinary native Git diff supplied the complete lock review instead.
No guard configuration or exception changed.

Keep the implementation worktree, native lifecycle records and raw verification
logs for the next slice and required independent verification. Max owns their
disposition at the architectural plateau. Test-created artifact directories are
owned and closed by their fixture; the older publication worktrees remain under
the previously recorded command-protection cleanup block.
The semantic negative-control worktree and its mutated source/test identities
remain inputs to independent verification. The pinned guidance tarball remains
rights/reproducibility evidence for that review. Reassess both after the pending
review and continuation no longer require them. No temporary dependency or
instrumentation is part of the delivered source.
