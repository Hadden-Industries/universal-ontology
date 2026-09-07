# Applying the temporary-artefact policy

This is a proposed extension to the supplied SDLC and repository-owned TDD
adaptation. It adds statements, handoff fields and review checks, not a new
orchestrator, permission grant or deletion daemon.

## Operating sequence

1. **Start:** use the existing change ID; inspect pre-existing work. Put task-owned
   disposable output in its own ignored subdirectory. Keep required evidence in
   the existing evidence system, not exclusively under scratch.
2. **Implement:** remove superseded scratch safely as you go. Promote a useful
   reproduction into a regression test or a genuine reusable helper into maintained
   tooling. Record only temporary survivors crossing a handoff boundary.
3. **Prepare final verification:** remove task-added probes, instrumentation,
   temporary dependencies and accidental scratch references from the deliverable.
   Rerun the applicable checks on the final source/test/configuration state.
4. **Review:** freeze the reviewed source as usual. Keep any precise inputs needed
   by an active verifier/reviewer. The reviewer checks the disposition but does
   not delete files from another task.
5. **After the agreed commit/handoff:** collect workers' results, check downstream
   consumers, secure required evidence and dispose of remaining eligible scratch.
   Inspect the actual paths immediately before deletion. Do not force a tool past
   a dirty-worktree or permission warning.
6. **Retain deliberately:** use an existing Issue/PR table for the few things still
   needed by rollout, a named next task, recovery or retention policy. Record when
   to reassess; at that checkpoint remove, promote or justify a new bounded use.
7. **Close out:** state what was removed, what was promoted, what was archived and
   what remains with an owner and reason. Do not claim that an unapplied deletion
   or inaccessible archive has been completed.

## Practical example (illustrative, not executed)

Issue #123 adds a tenant-disclosure rule. The implementation has been committed;
independent review and rollout validation remain in progress.

| Artefact | Disposition | Reason/checkpoint |
|---|---|---|
| `.sdlc/tmp/issue-123/run-a/probe_disclosure.py` | Remove when redundant | The maintained regression now exercises the real protected-record fixture. |
| Maintained tenant-disclosure tests and fixtures | Keep | They are durable protection, not a temporary reproduction. |
| Local copied security report | Remove only after retained bundle is checked | Reviewers need the original scan evidence; local duplication does not add value. |
| Disposable exploit checkout | Keep briefly, then remove | A named reviewer is still validating the original attack path; collect its evidence first. |
| Accepted Issue baseline | Keep under record policy | Historical acceptance must remain identifiable. |
| Backfill script needed by Issue #128 | Retain or promote | Consumer #128 is concrete; owner records reconciliation and rollback release conditions. |
| Draft plan duplicated by the accepted baseline | Remove working copy | No unfinished decision or consumer needs the draft; the accepted reasoning is retained. |
| Temporary production telemetry | Remove in a later reviewed change | Its rollout purpose has not yet ended just because code was committed. |

An existing Issue/PR section is sufficient:

```markdown
## Temporary artefact disposition

Removed: owned run-a probes and duplicate outputs after regression promotion.
Promoted: disclosure reproduction -> tests/claims/test_tenant_disclosure.py.
Retained evidence: EV-017 at <actual restricted evidence locator>.

| Temporary item/group | Consumer or obligation | Owner | Remove when | Reassess at |
|---|---|---|---|---|
| Exploit checkout for issue-123 | Reviewer validating original finding | Security reviewer | Validation finishes and required evidence is retained | Review handoff |
| Backfill helper | Issue #128 and release recovery window | Data-service owner | Reconciliation accepted and recovery dependency released | Release outcome review |

Unresolved: none.
Cleanup affecting tested inputs: probe removal was verified before final review.
```

Replace illustrative locators with real records. A table is not evidence that
an archive exists or that a dependent task has completed.

## Inspection commands, not blanket deletion

Run from the intended repository root. Inspect the known task subtree only:

```text
git status --short --untracked-files=all -- .sdlc/tmp/issue-123/run-a/
git ls-files -- .sdlc/tmp/issue-123/run-a/
git ls-files --others --ignored --exclude-standard -- .sdlc/tmp/issue-123/run-a/
git worktree list --porcelain
```

These Git commands help inspect tracked/untracked status; they do not prove
ownership, safe directory traversal, completed consumers, or retention eligibility.
A filesystem inspection of the exact directory is also required; do not traverse
links into unrelated data. Do not paste a deletion command until its specific
scope and authority have been established.

For an authorised tracked removal, preview the ordinary version-controlled change,
then record it through the normal PR/commit process. For a disposable linked
worktree, inspect all required local data and commits first, then use the normal
non-forced Git operation. Neither operation authorises removal of user-owned or
unknown material.

## Why not add a generic cleanup skill or post-commit hook?

Cleanup is a completion responsibility of the lifecycle owner. A post-commit hook
cannot infer completion of human review, dependent jobs, rollback use, incident
preservation or evidence retention. A second orchestrator adds overlap with the
TDD, release and specialist workflows. Keep the policy in AGENTS.md plus the
referenced policy document, and put checks at the existing review/handoff points.

A future deterministic helper may enforce an owned-path allowlist, path containment,
no links, no active lease, exact preview, and unchanged candidates. Its validated
mechanical checks still cannot prove the absence of a business/retention obligation.
Such a helper needs separate destructive-operation tests and authorisation. This
package does not implement one.

## Retention and verifiable documentation

The right operation is often **preserve the useful record, remove the redundant
working copy**. GitHub Actions supports per-artefact `retention-days` within the
repository/organisation limit. Deleting a run also deletes its artefacts, and
artefact deletion is not reversible [S4-S5 in the policy]. Do not leave an accepted
evidence record pointing only at an expired download; arrange the required retained
copy before expiry. OWASP applies retention obligations to temporary debug logs
and their copies too [S6]. This policy intentionally specifies no universal TTL.

A plain removal commit is not secure erasure of historical data. An exposed secret
requires the security response route, including revocation/rotation as appropriate
[S7]. Do not use routine cleanup to erase inconvenient failures or an incident
record.

## Acceptance tests for the policy

No synthetic adoption corpus is enabled here. If a real cleanup defect needs
reproduction, use a disposable repository with synthetic data and known file
identities under that task's accepted scope. Assert
preservation/deletion effects and truthful handoffs, not just the presence of
words in SKILL.md. Required negative cases include another task's scratch, ignored
credentials, active consumers, symlink escapes, lost-only evidence, unknown
retention, and attempted deletion of active lifecycle control state.

## DCG and legitimate cleanup

Native DCG may allow some temporary paths and block `git worktree remove` under
`strict_git`. Neither changes TA-02's ownership, consumer and evidence predicate.
If blocked, report the exact operation and seek a scoped operator decision; do not
substitute `rm`, PowerShell, Python or a file tool to accomplish the same forbidden
action. The operator can perform approved maintenance outside the agent or use an
appropriately scoped native exception. Do not grant that exception yourself.
