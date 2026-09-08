# GitHub governance

The source change and bug forms introduce useful options; legacy backlog entries
are not authoritative structure. R0/R1 may use the accepted task or normal PR brief.
All seven PR fields are the current metadata contract: Change issue, Accepted
baseline, Risk class, Acceptance IDs implemented, Baseline-only, New functionality,
and Software selection. R0/R1 may use none where applicable. Select actual risk
and functionality explicitly. Do not invent an Issue, baseline or acceptance ID.

The label helper owns its explicit 14 SDLC labels. Running it creates/updates them
through gh; it is separate from development setup. On title/body edits, the
Issue workflow invalidates any accepted lifecycle state and records state:changed.
This workflow writes labels/comments only on the authorized GitHub event; its
local fixture tests do not prove live delivery or permissions.

## Trusted policy and bootstrap

SDLC PR linkage checks out the event's base SHA and uses its .venv policy code.
Candidate baselines are read as blobs through the read-scoped GitHub API; candidate
program code is not checked out or executed. Complete file coverage, head/base
freshness, live title/body, schema, risk/state and baseline immutability are checked.
A reference's presence does not prove approval, research, naming or semantic intent.

First merge trusted control code through normal existing protections and the
explicit owner bootstrap approval. An initial run against base code that lacks
these files must fail honestly; no skip-to-green or candidate-policy fallback is
allowed. Preserve all existing required checks. Establish the actual stable check
names and successful subsequent PR behavior before adding a required SDLC check.
This repository-owned workflow is itself reviewable/mutable; it is not an
independently enforced organization workflow.

Issue edits do not automatically rerun old PR checks. Re-read the accepted dossier
and rerun linked checks before merge/release; do not enable auto-merge on an assumed
atomic Issue/PR transaction. A moved base or renamed baseline is rejected, but a
change after the final API read remains a limitation.

## Ownership and remote settings

CODEOWNERS uses the real Hadden-Industries engineering-governance and security
teams. GitHub requires visible teams and explicit repository write permission;
the declaration grants neither. The preceding team creation does not establish
those grants. Required-review/ruleset changes need their own exact settings review.
With only Max as member, a separate human approver is not available; GitHub does
not allow author self-approval. Do not claim organizational independence from two
teams containing the same person.

[GitHub's CODEOWNERS rules](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
own validity. Candidate workflow syntax checks and fixture tests cannot establish
account features, team permissions, token policy or required-check enforcement.
The source actions are pinned to checkout v7.0.1, setup-python v7.0.0,
github-script v9.0.0 and setup-node v7; exact identities are in the workflow files.

Dependabot groups npm/pip/Actions version updates into one daily
`repository-version-updates` batch, with zero cooldown and no custom PR-limit
override. GitHub's default five open version-update PRs per ecosystem applies;
this does not cap the number of dependency updates in a batch. Security updates
remain separate from this version-update batch. The owner confirmed no other
service covers this repository.

Assess each batch, then add the seven SDLC metadata fields and a concise research,
review and verification summary to its PR. Select risk from the actual changes;
grouping does not establish acceptance. Metadata-only body edits rerun linkage
validation; product and control workflows retain their existing event triggers
and input selection. No auto-approval, metadata exemption, silent downgrade or
second update service is supplied.

Keep undisclosed security evidence in an approved restricted store. The Issue Form
links to this repository's security page without claiming private reporting is
enabled. Native Codex Security installation, account access, scans and publication
are separate permissions. See [SDLC-BOOTSTRAP-01](SDLC-BOOTSTRAP-01.md).
