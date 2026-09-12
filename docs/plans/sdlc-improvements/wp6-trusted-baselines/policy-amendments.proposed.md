# WP6 — Proposed policy and documentation amendments

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Status:** proposal for exact-text review, not an applied or accepted policy change. Use with [the WP6 implementation plan](implementation-plan.md). The parent WP6 remains the scope authority; this companion is not a second requirements baseline.

**Reference points:** Universal Ontology `4aeae598b12aa005570bfe597b820fdf6aad706a`; ONI candidate `c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1`; ONI trusted base `975acf599d06ec3d274c55bac8d1731278ffa153`. Native governance and PR-template content were read at the UO revision. The other edits below specify insertion/replacement anchors in the already supplied guide/handoff structure; compare the actual accepted revision before applying. Reconcile intervening WP2/WP3 changes rather than pasting duplicate procedures.

Apply only after the corresponding format/reader contract is accepted. Do not publish documentation that advertises support absent from the actual trusted consumer. Preserve all unrelated content, historical evidence, current action pins and explicit authority boundaries. Do not change package status, global configuration, profiles, dependencies, native security exclusions or workflow permissions through these amendments.

## 1. `docs/sdlc/howto.md` — accepted baseline representations

Replace only the existing Issue-only R2/R3 representation paragraph under **Start and scope** with:

```markdown
R0/R1 need no artificial Issue or separate baseline. For normal R2/R3 work, use a
previously accepted baseline supported by the actual trusted policy consumer.
The Issue-snapshot route retains its native capture, schema, prior-baseline and
live Issue linkage requirements. The committed-plan route uses the unchanged
accepted UTF-8 Markdown file under `docs/plans/`, already present as a regular
file in the PR's trusted base, with an inspectable owner decision bound to that
exact content. It does not require inventing an Issue for previously accepted
work. A plan file, quoted approval or matching checksum does not authenticate
acceptance. Preserve the selected risk class and required verification profile.
The owner-approved bootstrap remains separately authorised; neither route creates
an approval for its own implementation.
```

Replace only the subsequent statement that says R2/R3 must use an Issue JSON path with:

```markdown
For R2/R3, `--baseline` names the selected accepted Issue JSON snapshot or the
supported committed plan. For a plan, `--intent-reference` identifies the actual
owner decision; its presence alone does not verify that decision. Use the native
snapshot procedure only for Issue capture. Do not rewrite an accepted plan into
a fictitious snapshot or edit accepted bytes merely to satisfy metadata syntax.
```

The existing begin example remains a small R0 example. Do not add an unconditional network call to `begin` or change an existing active task to demonstrate the new paragraph.

## 2. `docs/sdlc/howto.md` — bounded preflight and remote readback

Insert after the existing discussion of profiles/freshness and before **Evaluation through useful work**:

```markdown
## Check the next execution boundary

Before expensive qualification, use the existing task/PR record to establish
only the prerequisites the next step needs: actual acceptance and baseline
compatibility in the trusted consumer; required runtimes; native security
inventory and artifact-writer coverage when applicable; and the dependency gate's
actual threshold, scopes and unresolved dispositions. Reuse still-current native
evidence. Record `ready for the stated next step`, `blocked`, `unknown/unavailable`
or `not applicable with reason`, with a next actor for gaps. This is not a new
universal dossier, scanner, installer or product-approval gate. Continue independent
authorised work that does not depend on a blocked boundary.

A local preflight may invoke the existing validator from an independently trusted
policy checkout using a retained native PR input snapshot and its existing
read-only API interface. Label that input as local preflight, not a delivered
GitHub event. Before a PR exists, prospective fixtures establish compatibility
only. No candidate policy runs with the trusted workflow's credentials.

At push/PR handoff, read the actual PR base/head and the relevant workflow event,
run, attempt and every applicable job. Distinguish the policy revision executed
from the candidate revision and any synthetic merge tested. Read a failing job's
native result, not only an aggregate or old PR description. Required skipped work,
missing logs and inaccessible enforcement settings remain explicit gaps.

Landing new trusted policy requires a new qualifying event whose actual policy
checkout is verified. Re-running an older workflow retains that event's original
SHA/ref; it does not automatically adopt current default-branch policy. Do not
create meaningless commits, false events or a candidate-policy fallback to turn
an old check green. Baseline linkage, product verification, human acceptance and
release/publication authority remain separate conclusions.
```

## 3. `docs/sdlc/github-governance.md` — field and trust contract

In the opening paragraph, replace the statement that **all seven fields** are the entire metadata contract with:

```markdown
The seven common PR fields are Change issue, Accepted baseline, Risk class,
Acceptance IDs implemented, Baseline-only, New functionality, and Software
selection. The committed-plan route additionally requires exactly one `Baseline
acceptance` field containing an inspectable decision reference. R0/R1 may use
`none` where applicable. Select actual risk and functionality explicitly. Do not
invent an Issue, baseline, acceptance ID or owner decision.
```

Under **Trusted policy and bootstrap**, replace the first paragraph only with:

```markdown
SDLC PR linkage executes the trusted revision selected by the workflow event,
using that checkout's policy code, schemas and environment. Record the actual
checked-out policy SHA; it may differ from the current PR base or candidate head.
Candidate baselines are read as data through the read-scoped GitHub API, never by
checking out or executing candidate code. Resolve the selected canonical path in
the pinned Git tree and preserve native mode/type/object identity and bytes;
a file-shaped Contents API response alone does not prove a regular-file entry.

The Issue route preserves its live title/body, schema, risk/state, version and
history checks. The plan route requires the exact unchanged regular-file baseline
at both PR base and head, strict UTF-8 text, a decision reference and the selected
source-line references. Plan references are a nonempty JSON array of distinct
exact lines, each occurring once in that accepted text; they are linkage, not a
Markdown requirements engine or proof of implementation. A selected plan cannot
be introduced or changed by the implementation PR. The existing baseline-only
Issue route is not extended to create a plan in the same PR as its implementation.

Complete file coverage, rename sides and head/base/metadata freshness remain
required. A plausible acceptance string, committed document or schema pass cannot
establish an owner decision. The accountable acceptance gate must inspect the
actual decision, authority, scope and exact content binding before reliance.
A validator success is named and reported as metadata/baseline linkage only.
```

Preserve the existing bootstrap paragraph: missing trusted support fails rather than running head policy. Append to that paragraph:

```markdown
An accepted format-support change is landed separately through the currently
supported policy route before a feature relies on it. A genuine policy-change
Issue is not a fictitious Issue for the converter. Do not combine the converter
implementation with an unaccepted validator repair or lower its risk to unblock
linkage. After deployment, verify the new event's actual policy revision; an old
workflow rerun is not an update mechanism.
```

Keep the existing warnings about non-atomic Issue/PR state, author self-approval and unestablished native rules. After them, add:

```markdown
A missing inspectable acceptance or functioning accountable decision gate is an
unqualified acceptance boundary, not a reason to manufacture a reference. Record
actual applicable branch/ruleset enforcement only when observed; this document
and a passing workflow do not create it. Any settings change retains separate
exact authority.
```

In the later Dependabot paragraph, change **“add the seven SDLC metadata fields”** to **“add the common SDLC metadata fields and the conditional plan-acceptance field when applicable”**. Leave update frequency, grouping, check triggers and other existing configuration unchanged.

## 4. `.github/PULL_REQUEST_TEMPLATE.md` — conditional plan instructions

Replace the first HTML comment with the following. Leave all seven actual field lines in place; **do not add an unconditional eighth placeholder field**:

```markdown
<!-- The seven lines below are the common metadata-check contract. R0/R1 may
use 'none' where applicable. For the supported committed-plan route, add exactly
one Baseline acceptance field immediately after Accepted baseline, with the actual
inspectable owner-decision reference. Do not add it merely to claim approval.
Issue snapshots keep their existing capture/linkage procedure. -->
```

After the existing paragraph under **Purpose, accepted scope and outcome**, add:

```markdown
For a committed plan, identify its exact native base/head blob and the owner
acceptance that binds that content. The plan must pre-exist unchanged in the
trusted base. Supply Acceptance IDs implemented as a JSON array of distinct exact
source lines from that plan, each appearing once. Do not use rendered heading
slugs, rewrite accepted text, or invent an Issue/acceptance. These fields establish
linkage, not human approval or implementation coverage.
```

After the existing **Evidence and principles review** bullets, add:

```markdown
When remote qualification is material, identify the actual policy/base/head/tested
revisions, workflow event/run/attempt and applicable job results. Distinguish
failed, skipped and unavailable evidence. State the native dependency gate's
threshold/scopes and the owner disposition of any remaining conflict; a clean
production audit or a high-severity-only audit does not establish a differently
configured gate. Keep historical results as historical and update stale current
status rather than copying an obsolete pending narrative.
```

Do not paste an alternative filled PR metadata block into the actual PR body: duplicate fields are invalid. Preserve the existing checkbox disclaimer, security section and all separate release/command-safety authority.

## 5. Existing routing/handoff references — one brief rule, no new ceremony

In `.sdlc/skills/test-driven-development/references/evidence-and-handoffs.md`, add to **Verification order and freshness**:

```markdown
Before expensive qualification, expose a known incompatible trusted baseline
consumer, missing required runtime/security capability, or conflicting dependency
gate in the existing record. Reuse the owning consumer's supported checks; do not
create a second selector, approval oracle or preflight dossier. A blocked dependency
limits only work that needs it. Final required evidence remains required.

For a PR handoff, distinguish local results from the actual remote event, policy
revision, PR base/head, tested revision, run/attempt and relevant jobs. Include
unavailable/skipped evidence and the next owner decision. Preserving an R2 route
does not require repeating a full profile after every small edit; verify the
final frozen object and affected changes under the existing policy.
```

If the actual `.sdlc/skills/sdlc-route/SKILL.md` or its maintained references say that an Issue JSON snapshot is the only possible R2/R3 representation, replace **only that representation restriction** with:

```markdown
Use the actually accepted prior baseline supported by the trusted consumer:
an Issue snapshot under the existing native contract, or the unchanged accepted
committed plan under the approved plan contract. Verify the real decision and
content binding separately. Preserve R2/R3 assurance and do not invent an Issue,
recapture accepted content or run candidate policy to bypass an unavailable route.
```

That last replacement is conditional on the actual consumer inventory: no file edit is required where the maintained source is already representation-neutral. Re-read the owning reference; do not infer its exact wording from a skill name.

## 6. Verification of the amendments

Acceptance requires the changed text to match the delivered format/CLI/remote contracts; native tests for both representations; a helper-only check-selection regression where applicable; and a reviewer walkthrough using actual accepted and deliberately invalid references. A text search for these paragraphs is not behavioral validation.

The local preflight recipe must preserve its read-only and child-environment boundary. Record real native outcomes in the existing adoption/task evidence after execution. Do not prefill a future `passed`, manufacture an approval/merge timestamp, overwrite failed history, or update package deployment status solely because this proposal exists.

## Evidence references

The parent and WP6 main plan supply the governing scope and detailed source list. Particularly relevant reads are the ONI adapter/validator and exact trusted workflows (main plan S03–S10), current ONI runs (S13–S17), and GitHub primary documentation on `pull_request_target`, reruns and Contents/tree/blob semantics (W01–W07). The UO governance/template anchors were read at `4aeae598b12aa005570bfe597b820fdf6aad706a`:

- [GitHub governance](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/docs/sdlc/github-governance.md).
- [PR template](https://github.com/Hadden-Industries/universal-ontology/blob/4aeae598b12aa005570bfe597b820fdf6aad706a/.github/PULL_REQUEST_TEMPLATE.md).

No policy amendment has been applied by preparing this document.
