# WP6 — Preflight and remote-handoff worksheet

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Proposed operating recipe; not a completed assessment, live GitHub event or new SDLC command.** Reuse the sections that the current task needs in its existing record. Do not require a new file or full checklist for every small task. The [WP6 plan](implementation-plan.md) owns the design; its parent A11/A12 remain the acceptance criteria.

## 1. Bind the object and authority once

| Item | Record the actual value |
|---|---|
| Task and accepted scope | Existing task/Issue/PR, relevant acceptance decision and limits |
| Repository and PR | Actual base repository; PR number; head repository when different |
| P — policy executed | Full trusted revision, actual checkout, validator/schema/dependency identities |
| B — target/base | Actual base SHA used for prior-baseline presence |
| H — candidate | Actual head SHA; local dirty/index inputs when applicable |
| T — product tested | Actual checkout SHA for each relevant product job, including a synthetic merge |
| Baseline | Canonical path, representation, native tree mode/type/blob and raw byte identity |
| Decision | Actual actor/authority, inspectable reference, scope and exact-content binding |
| Evidence location | Existing approved private location, actual reader and retention conditions |
| Read authority | Existing read-scoped access; no new credentials or write permissions |

A branch name, PR description or workflow `head_sha` alone does not identify P or T. Absence of an inspectable decision is a hold, not permission to write “approved.” Do not copy private decision content into a public record automatically.

## 2. Small readiness table

Use only applicable rows; reference still-current evidence rather than repeating it.

| Boundary | Ready / blocked / unknown / not applicable | Actual evidence and next actor |
|---|---|---|
| Accepted baseline and trusted format consumer | | |
| Runtime and required tools | | |
| Native security inventory and scoped alternative | | |
| Required artifact writer | | |
| Native dependency policy and remaining dispositions | | |
| Remote enforcement, only when claimed | | |

`Ready` means ready for the stated next step, not release. A failed prerequisite does not stop independent authorised work elsewhere. Do not start a native security scan just to fill a row, install tools automatically, or treat a metadata reference as authenticated approval.

## 3. Local trusted-consumer preflight using the existing interface

### Preconditions

The PR exists and its current native metadata can be read through an already authorised interface. Select an independently trusted policy checkout at P, with its approved `.venv` and required dependencies. Its local source/imports, configuration and environment must have been checked against P; a matching HEAD alone does not exclude dirty policy or an untrusted Python search path. Never run the candidate's validator with the trusted job's token.

Capture the **complete native PR object** to a fresh restricted file. Verify its repository, number, full base/head identities and returned head repository. The small JSON envelope `{"number": <actual number>, "pull_request": <actual PR object>}` is a **local preflight input snapshot**, not an assertion that GitHub delivered that event. The existing validator re-reads live metadata; movement makes it fail or stale rather than current success. Before a PR exists, use explicitly labelled prospective compatibility fixtures with no fabricated event/approval.

### Bounded child-environment recipe

This illustrative Python recipe uses the existing validator environment/entry point and no proposed CLI flags. Bind the inspected paths/repository/revision to actual values before an authorised invocation. It is provided as an operator recipe, **not** a new maintained preflight runner to install in the repository. The recipe has not been executed against either user repository in preparing WP6.

```python
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# Bind these to inspected, approved locations and actual identities.
policy_root = Path(r"<actual-trusted-policy-checkout>").resolve(strict=True)
policy_sha = "<actual-full-trusted-policy-sha>"
repository = "<actual-owner>/<actual-repository>"
pr_json = Path(r"<actual-retained-native-pr-object.json>").resolve(strict=True)
evidence_parent = Path(r"<actual-approved-private-evidence-parent>").resolve(strict=True)
run_name = "<new-inspected-run-name>"

if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", policy_sha):
    raise ValueError("Bind the actual full native policy revision.")
if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
    raise ValueError("Bind the actual GitHub repository identity.")
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}", run_name):
    raise ValueError("Bind a fresh single-component evidence name.")
if not os.environ.get("GH_TOKEN"):
    raise RuntimeError("Existing read-scoped GH_TOKEN is unavailable; do not acquire broader authority.")

python = policy_root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
validator = policy_root / "scripts/validate_sdlc_pr.py"
if not python.is_file() or not validator.is_file():
    raise RuntimeError("Trusted interpreter/validator is unavailable; do not fall back to another checkout.")
head = subprocess.run(
    ["git", "--no-optional-locks", "-C", str(policy_root), "rev-parse", "HEAD"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
).stdout.decode("ascii", "strict").strip()
if head != policy_sha:
    raise RuntimeError("The actual policy checkout is not the selected P.")
# This check is corroboration only: approved dirty-state/import/environment
# inspection is an explicit precondition, not inferred from HEAD.

raw_pr = pr_json.read_bytes()
pr = json.loads(raw_pr.decode("utf-8", "strict"))
if not isinstance(pr, dict) or not isinstance(pr.get("number"), int):
    raise ValueError("A retained actual native PR object is required.")
if pr["number"] <= 0 or pr["base"]["repo"]["full_name"] != repository:
    raise ValueError("PR and repository identities do not agree.")
for side in ("base", "head"):
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", pr[side]["sha"]):
        raise ValueError(f"Native {side} revision is not a full object identity.")

# Creating this directory/writing these data files requires the named scope.
# mkdir is create-only: an existing attempt is never overwritten.
output = evidence_parent / run_name
output.mkdir(exist_ok=False)
event = output / "local-preflight-input.json"
with event.open("xb") as handle:
    handle.write(json.dumps(
        {"number": pr["number"], "pull_request": pr},
        ensure_ascii=False, indent=2,
    ).encode("utf-8") + b"\n")

child_env = dict(os.environ)
child_env["GITHUB_REPOSITORY"] = repository
child_env["GITHUB_EVENT_PATH"] = str(event)
# Parent/global environment is not changed. Do not print child_env or the token.
receipt = {
    "kind": "local-trusted-linkage-preflight-observation",
    "notAGitHubEvent": True,
    "notHumanApproval": True,
    "policyRevision": policy_sha,
    "baseRevision": pr["base"]["sha"],
    "headRevision": pr["head"]["sha"],
    "inputSha256": hashlib.sha256(event.read_bytes()).hexdigest(),
    "nativePrSnapshotSha256": hashlib.sha256(raw_pr).hexdigest(),
    "startedAt": datetime.now(timezone.utc).isoformat(),
    "status": "running", "exitCode": None,
}
with (output / "started.json").open("x", encoding="utf-8", newline="\n") as handle:
    json.dump(receipt, handle, indent=2)
    handle.write("\n")

# Byte capture does not depend on the console's code page and is retained even
# when the child fails. The inspected trusted script owns all API requests.
with (output / "stdout.bin").open("xb") as stdout, (output / "stderr.bin").open("xb") as stderr:
    try:
        result = subprocess.run(
            [str(python), "-B", str(validator)], cwd=policy_root,
            env=child_env, stdin=subprocess.DEVNULL,
            stdout=stdout, stderr=stderr, timeout=120, check=False,
        )
        receipt["exitCode"] = result.returncode
        receipt["status"] = "linkage-valid" if result.returncode == 0 else "failed"
    except subprocess.TimeoutExpired:
        receipt["status"] = "timeout"
        receipt["error"] = "Direct validator timed out; available bytes retained. Descendant cleanup not attested."
    except OSError as error:
        receipt["status"] = "unavailable"
        receipt["error"] = f"{type(error).__name__}: {error}"
receipt["finishedAt"] = datetime.now(timezone.utc).isoformat()
for name in ("stdout.bin", "stderr.bin"):
    receipt[name + "Sha256"] = hashlib.sha256((output / name).read_bytes()).hexdigest()
with (output / "finished.json").open("x", encoding="utf-8", newline="\n") as handle:
    json.dump(receipt, handle, indent=2)
    handle.write("\n")
print(f"Local linkage preflight: {receipt['status']}; human acceptance and remote CI are separate.")
raise SystemExit(0 if receipt["status"] == "linkage-valid" else 1)
```

The 120-second deadline is a proposed bound for this illustrative read-only recipe, not a new universal policy timeout. Change it only under the actual operation's scope. Store failures safely. If recording itself fails, do not claim the result was retained; preserve available files and report the storage limitation. No atomic multi-file/durable-ledger guarantee is claimed. A terminated recipe may leave `started.json` without `finished.json`: that is unfinished evidence, not zero exit or approval.

API availability, actual token scope and dirty policy/environment checks remain external preconditions. This recipe does not enforce GitHub branch protection or authenticate an arbitrary acceptance reference. Do not adapt it into an agent wrapper that executes source code fetched from H.

## 4. Acceptance-reference readback

Use the existing accountable approval record. Establish actual actor and authority, decision date/context, accepted scope, exact retained content and any amendments. Connect a historical named file/version to the current blob only when its retained bytes make that inference supportable. Otherwise obtain an explicit decision before reliance.

A fabricated but plausible string may pass syntax. The complete acceptance boundary must reject it. Keep that distinction in the handoff: `linkage-valid` and `acceptance-confirmed` are different statements, and the latter must name its actual decision evidence. Do not create an `authenticatedAccepted` attribute in the validator to conceal this limit.

## 5. Remote readback sequence

Read the actual current PR. Record B/H, current state and the applicable accepted metadata separately from any old narrative. Retrieve relevant runs for both `pull_request` and `pull_request_target` events; a convenience API filtering to the former does not cover trusted linkage. Resolve each required run's actual attempt and fetch every job page for that attempt. Preserve waiting, action-required, failed, cancelled, skipped and unavailable states rather than flattening them to pass/fail.

Read the failed dependency job and the trusted linkage job, including selected refs, actual checkout and final error. Where enforcement is claimed, inspect the actual required checks/approvals/ruleset through authorised native reads. Inaccessible settings remain unverified; do not grant administration access or change rules just to fill the table.

| Workflow/event | Run / attempt | Actual P or T | Relevant jobs and conclusions | Error/findings, evidence and next actor |
|---|---|---|---|---|
| Trusted linkage | | | | |
| Product/dependency checks | | | | |
| Other required checks | | | | |

Do not omit required jobs merely because a product aggregate is green, or claim a skipped mutation matrix passed. Native success for a scope-skipped job is not new assessment of that scope. Re-read B/H and relevant metadata after collection; movement narrows the evidence to its earlier target and requires reassessment.

## 6. Deployment and dependency disposition

Land the separately accepted baseline-format/validator change using the currently supported policy path. No feature-baseline substitution, candidate-policy execution or risk downgrade. After merge, use the next genuine supported event and verify its actual P. A rerun of an earlier workflow retains that event's original SHA/ref and is not a trusted-policy update.

Select an explicit adopter dependency disposition:

- **D61:** a supported compatible dependency repair, separately approved and verified.
- **D62:** an explicitly accepted native exception with its real granularity, risk, owner and reassessment event; no implication that an advisory-level exception is manifest-scoped.
- **D63:** an accepted architecture/scope boundary with native evidence; no relabelling to hide a reachable dependency.
- **D64:** retain the failing gate and a named hold while diagnosis or a decision is pending.

These choices do not lower inherited mutation gates, change low/all-scope dependency policy by default, or authorise publication. Keep the current early dependency gating unless a separately accepted change establishes a better correct contract.

## 7. Historical example from this research — not a future populated pass

Observed on 10 September 2026: ONI PR #4 B=`975acf599d06ec3d274c55bac8d1731278ffa153`, H=`c8b9d0495e2e163d9a8a1812f8124efb04b5c7b1`.

Trusted linkage run `34524389602`, attempt 1, job `103029579766` executed P=`975acf5…` and failed with `Invalid baseline path`. BBCode run `34524391937`, attempt 1, dependency job `103029588085` failed with two moderate `qs@6.5.5` advisory matches in the comparator lock; converter/mutation jobs skipped and aggregate `103029708307` failed. The dependency configuration was low severity and runtime/development/unknown scopes. The observed product checkout T was `5b4a9b95d8976cddc971cca3c8fdea3f03525321`.

The PR narrative still referred to an older candidate. This paragraph is retained research context, **not** the current execution team's D61–D64 choice or proof of a later fix. Re-read the real target and decisions when this worksheet is used.

## 8. Handoff conclusion

State the qualified scope, actual acceptance binding, baseline consumer identity, remote evidence, remaining gaps and next actor. A correct result can be **trusted baseline qualified / feature blocked**. A successful format repair does not need to manufacture a green converter PR or release. Conversely, a local adapter test without actual trusted adoption cannot close WP6.

Sources: the main plan's P0 and S03–S17/W01–W10. The worksheet itself grants no credential, filesystem, workflow-event, configuration or publication authority.
