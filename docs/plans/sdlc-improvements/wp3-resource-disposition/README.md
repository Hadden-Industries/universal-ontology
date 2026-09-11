# WP3 implementation-planning package

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Prepared:** 10 September 2026. **Status:** researched proposal, not installed or executed SDLC functionality.

## Contents

| File | Purpose |
|---|---|
| [Detailed implementation plan](implementation-plan.md) | Expands the parent WP3 and A07/A08 into the selected design, eight delivery slices, 36 proposed regression scenarios, two operational observations and twelve acceptance criteria. |
| [Exact proposed policy amendments](policy-amendments.proposed.md) | Five existing document/skill surfaces, with exact insertion/replacement text and unchanged authority boundaries. |
| [Proposed resource-disposition schema](resource-disposition.schema.proposed.json) | One Draft 2020-12 schema for the caller-input and writer-owned stored record branches. |
| `examples/` | Eight synthetic declaration/record examples. They represent no real owner decision, preservation result, operator denial or removal. |
| [Mechanical-check record](artifact-checks.json) | Actual structural checks, deliberate demonstrations of schema limits, environment and source/proposal identities. |
| [Check script](check_planning_package.py) | Repeats package/schema checks only; does not implement the SDLC feature or access worktrees. |
| `original-delivery.sha256` | Integrity manifest for the delivered package files. A digest identifies content, not its correctness or approval. |

## Selected boundary

The proposed implementation records resource-disposition metadata and provides read-only status after an implementation task has handed off. It does not execute removal, run recorded command text, create a global registry, modify guard configuration or grant authority.

The main plan specifies a new `record-resource-disposition` subcommand and a changed status-output contract. Neither should be invoked as if already deployed. Writer fields must not be accepted through the input branch. Eligibility is a recorded historical assessment, not current deletion permission. Real removal remains the existing separately authorised Git/operator procedure with fresh inspection and actual outcome/readback evidence.

The record schema verifies declaration structure. Runtime code must also enforce record-graph integrity, host/path scope, protected-worktree boundaries, actual observation membership and the distinction between reported and independently observed facts. Human approval and actual preservation cannot be authenticated by nonempty references.

## Check record and limitations

The supplied mechanical check record reports **43 scenarios matching their expectations** in the stated Linux/Python/jsonschema environment. These include deliberately valid structures whose claimed authority, reference validity, supersession integrity or path binding cannot be proved by schema. Passing those cases means the limitation was demonstrated, not that the associated resource is safe to remove.

No proposed command, new production module, Windows/NTFS/PowerShell/DCG behavior, repository test catalogue, worktree preservation, resource removal, operator notification or live adoption exercise has been run by this check script. T301–T336 and O31/O32 in the main plan are future implementation/acceptance obligations.

The root schema intentionally describes both input and stored objects. The production recorder must select `#/$defs/input` or equivalently enforce the input discriminator before validating; accepting any root-union member as input would wrongly admit writer-owned fields.

Use the already approved local Python environment with its existing `jsonschema` installation to rerun `check_wp3_artifacts.py --output <new-local-result.json>`. The optional `--source-directory` hashes the named parent and earlier WP documents when present. Do not overwrite the delivered original result to imply that a later run is the same observation. No new dependency installation is implied by this package.

## Source and adoption boundary

The source revision inspected was `79d187802f9255134c03d0786ff75181ed1070ee`. The parent SDLC plan, original worktree handoff and earlier WP0–WP2 documents remain distinct source inputs; their proposals are not treated as deployed repairs. Source links and exact local document identities appear in the plan and check record. Original user documents and private worktree evidence are not duplicated into this package.

Apply the existing exact policy/configuration approval, implementation, baseline, verification, commit and platform-action requirements. Keep historical task/verification records intact. The six historical worktrees are reconciliation subjects, not disposable test fixtures. The main and outer SHACL worktrees remain outside their disposal scope.

## Organized-copy boundary

The original delivery manifest and check results describe the historical package, before documentation references were edited. They do not verify this reorganized copy. The retained Python files are historical planning recipes; their embedded original filenames are not maintained execution instructions. Current navigation is checked separately.
