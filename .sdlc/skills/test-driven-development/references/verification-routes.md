# Verification Routes and Recovery

Read when test-first is not the correct description of the work. These routes
are selected by observable conditions and repository authority, not convenience.
No route permits invented intent, hidden failures, or a weaker release gate.

## Route table

| Situation | Route and required evidence |
|---|---|
| New/changed executable behaviour or causal repair | `test-first`: establish a meaningful pre-change failure; implement; observe green; refactor and regress. |
| Refactor preserving behaviour | `preservation`: establish representative passing tests/contracts; refactor with unchanged oracle; compare again. No artificial red required. |
| Legacy/existing implementation with incomplete knowledge | `characterization`: capture observed behaviour, mark it descriptive, challenge sensitivity and obtain authoritative intent for disputed behaviour. |
| Required behaviour already works | Validate test setup/path and relevant negative controls; report already satisfied. Add useful regression protection, not an unnecessary implementation. |
| Generated code | Test the generator/source contract and consumer/schema compatibility; regenerate using the accepted toolchain. Do not edit generated output to satisfy a test. |
| Configuration/build/CI/infrastructure | Validate schema AND relevant effective behaviour, deployment plan or policy invariant in an isolated environment. A parsed file alone does not prove operational effect. |
| Human prose or mechanical rename | Appropriate link/build/schema/consumer checks and review; no ceremonial unit test. A rename with API/semantic effects is not merely mechanical. |
| Agent instructions or skills | Repository-grounded behaviour evals plus format/packaging checks; matching expected words does not prove agent behaviour. |
| Performance or reliability | Predeclared workload, measurements, baselines, thresholds, variability and environment; preserve functional regressions. Do not move a threshold to make the result pass. |
| Concurrency/non-deterministic failure | Prefer controlled schedule, barrier or fault injection; otherwise record attempts, observed frequency and residual uncertainty. |
| Data migration | Start with representative old data/schema; verify upgrade, mixed-version contracts, idempotence, resume/reconcile, and the accepted restore/forward-fix route. |
| Visual/UI/accessibility | Component/interaction checks plus rendered inspection, relevant accessibility checks and accepted visual evidence. Do not blanket-accept a regenerated screenshot. |
| Exploration spike | Isolate it; define a falsifiable question and bounded outputs. Promotion into production needs accepted requirements and normal verification; do not claim a prototype is verified. |
| Required tool/environment absent | Record `unavailable`; do not fabricate red/green or raise permissions. The lifecycle owner arranges evidence or an explicit waiver. |
| Live incident | Follow the separately authorized mitigation/runbook, not this skill as incident commander. Route the durable fix back through normal evidence. |

Read the accepted risk route first. R0 may use a supplied criterion without a
formal dossier. In this SDLC, R1 uses its compact accepted task/Issue brief and proof scope; R2/R3 use their previously approved baseline and proof scope.
The skill cannot waive those requirements. R2/R3 require the lifecycle's relevant
independent oracle/verification and specialist evidence; it is not enough for the
implementer to state that a risk is small. A previously approved tailoring decision
is reusable; unnecessary repeated human prompts are not an assurance mechanism.

## Existing work is preserved

When source precedes the test, stop further speculative edits and inspect
provenance. Never delete, reset, overwrite, stash, or recreate existing user work
merely to conform to chronology. Do not claim a reconstruction happened earlier.

Identify the behaviour's accepted oracle without copying the implementation. Add
characterization/contract checks as appropriate. In a separate authorized copy,
replay against the known defective revision or introduce a targeted realistic
mutation to establish sensitivity. Record that this was retrospective validation.
An owner can still request a rewrite for technical reasons; chronology alone does
not justify destruction.

A green characterization test records what the code does, not what the business
requires. Mark known defects and ambiguities. Do not silently enshrine them as
requirements or change externally observable behaviour during a pure refactor.

## Test corrections versus oracle changes

A draft test's typo, fixture construction, selector or runner configuration can be
corrected within scope when the accepted behaviour is unchanged. Explain the fix
and rerun. This does not require a new requirements approval each time.

A test-oracle change alters expected behaviour, acceptance thresholds, protected
reproductions, compatibility or accepted risk. Preserve the old test and evidence;
record the conflict, its authoritative sources, effect and proposed decision in
the existing dossier. Obtain the required independent review/acceptance and new
baseline before implementing the changed requirement. Do not relabel such a
change 'fixing the test' to bypass review.

Threshold/timeout increases, skip markers and snapshot regeneration require the
same distinction: a demonstrated infrastructure correction can be legitimate; an
unexplained weakening to obtain green cannot. Record pre-existing failures as
failed, even when an owner accepts a waiver. A waiver is an authorization artifact,
not a passing test result.

## Mixed work

One ticket may need several routes: characterize legacy behaviour, preserve it
while extracting a seam, then test-first a new policy. Record the route per slice
or invariant. Do not classify the entire ticket as an exception because one part
cannot use an ordinary unit test.
