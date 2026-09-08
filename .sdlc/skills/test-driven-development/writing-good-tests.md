# Writing Good Tests

Read when adding/changing a test, fixture, double, or test utility. This replaces
rather than layers over the upstream reference. Preserve three independent checks:
**expected result, actual precondition, and observed system behaviour**.

## 1. Establish an independent expected result

Name the accepted contract and realistic fault this test should detect. Use a
literal or independently checked example, an authoritative contract, a justified
property, or a reference implementation with sufficiently different failure modes.

Do not calculate `expected` using the subject or its helpers, copy its algorithm
into the test, generate a golden file from it without review, or use a second
agent's agreement as the only justification. Shared test-data builders are fine
when they do not compute the behaviour being verified.

Property and metamorphic tests are useful when a complete oracle is expensive.
Check their non-vacuity: a serializer/parser round trip can pass when both share
the same error. Combine it with known external vectors or independent checks.
Record what a differential reference is trusted to establish; agreement is not a
universal correctness proof, and a known legacy defect must not become the target.

Test observable decisions, not incidental implementation structure. Exact text,
bytes, constants, exception types, or calls ARE appropriate expectations when
an accepted wire protocol, compatibility, legal text, safety, or user-facing
contract requires them. Do not ban precise checks just because they are precise.
Do not require a separate test for every getter, private method, or line.

## 2. Prove the important input and state

A test may pass because it never created the condition it claims to exercise.
For platform-dependent or indirect setup, assert or independently inspect the
precondition. Examples: the foreign-tenant record exists; two workers actually
overlap; the file contains a BOM; permissions are really denied; a message was
redelivered rather than delivered once; the migration starts from the old schema.

Use a positive control when it distinguishes an invalid fixture or a blanket
implementation from the intended result. A disclosure-denial test needs a real
protected object and a legitimate-access test; otherwise 'always not found' can
pass. A successful test run must not conceal zero selected examples or all skips.

Do not assert every obvious constructor detail. Focus on preconditions whose
failure would invalidate the inference, especially when an external API, clock,
filesystem, DB transaction, encoding library, or scheduler creates the state.

## 3. Exercise the real contractual boundary

Prefer the smallest real component or component set that can falsify the claim.
A narrow unit test can verify a pure rule; an adapter needs a contract test;
a wiring, persistence, authorization or transaction claim needs the corresponding
real path. One does not substitute for all the others.

Do not duplicate framework test suites. Do test your wiring where a wrong route,
serializer, policy registration, transaction, or configuration is a plausible
application defect. A real route smoke test can catch your omitted middleware.
Document genuine dependency assumptions and keep their characterization narrow.

Test doubles are allowed for costly, unsafe, unavailable, nondeterministic, or
external boundaries: time, randomness, network, payment provider, notification
sink, and controlled failure injection. 'External' means outside the behaviour
under test, not necessarily outside the process. Keep the decisive behaviour real.
Never contact live paid services or production systems merely to avoid a mock.

For each non-obvious double state why, which contract it represents, and how that
contract is checked. Verify arguments, calls, order, or absence of a call when
those ARE the obligation; a spy proving 'no external write occurred' is legitimate.
Asserting only that a mock UI component exists is not.

Use contract-valid representative fixtures. Preserve relevant required fields,
optional/absent values, error variants and downstream dependencies. Do not blindly
populate every documented optional field: that can hide missing-field handling.
Keep end-to-end or adapter contract evidence for assumptions a double cannot test.

Test helpers can build/clean resources. Do not add production switches bypassing
real logic solely for tests. A proper clock abstraction, dependency boundary, or
resource owner with `close()` may be good production design even if tests expose
the need first. Judge ownership and use, not merely current call-site count.

## 4. Make feedback representative and reproducible

Use isolated data, disposable stores, recorded seeds, deterministic scheduling or
barriers, controlled time, and clear timeouts. Do not use arbitrary sleeps or
retry-until-green as a replacement for understanding races. For statistical tests,
record trials, distribution/threshold assumptions and uncertainty; do not call a
single lucky run deterministic proof.

Use dependency and coverage/test maps, direct callers, shared contracts, build
configuration, platform variations and prior failures to select regressions.
Widen the scope when those maps are absent, stale, or incomplete. If a required
suite is unavailable, retain the gap for the independent verifier/CI; a mocked
substitute does not silently discharge it.

## 5. Challenge important assertions

After confirming the baseline passes, execute a representative realistic fault
in a disposable copy when risk warrants it: remove an authorization predicate,
change `<` to `<=`, omit a persisted write, or force an incorrect branch.

A useful result is an assertion failure at the intended behavioural contract.
A syntax error, broken import, crashed harness, or changed fixture does not show
that the assertion detects the production fault. Restore/recreate the clean copy
and confirm the candidate still passes. Keep a hash and log of what was tested.

A survivor means investigate: missed behaviour, irrelevant/equivalent mutant,
insufficient execution, or a misunderstood requirement. Do not require 100%
mutation score, a mutation for every test, or artificial tests to improve a metric.
For a reported defect, replaying the regression against the preserved defective
version is often the strongest cheap control. Do not reset the user's worktree.

## Example pattern

A claim-status endpoint has three separate accepted obligations:

- A member of the owning tenant sees the allowed status fields.
- A member of a different tenant receives the same public denial payload as for
  a missing claim; the protected record is never returned.
- Legitimate access still works after the isolation fix.

Use a real existing claim and distinct tenant contexts. Expected public payloads
come from the accepted disclosure contract, not the endpoint's response builder.
An 'always deny' mutant must fail the allowed-access test; an 'omit tenant check'
mutant must fail the foreign-tenant test. This still does not establish session
authentication, database isolation, logging privacy, or timing indistinguishability:
those require their own applicable boundaries and evidence.

## Gate before keeping a test

Can you identify its accepted claim, independent expectation, important setup
condition, real exercised boundary, and meaningful counterexample? If not, improve
or replace it. Keep complementary assertions for one scenario together where that
makes the contract clearer. Test quality is not assertion count or code coverage.
