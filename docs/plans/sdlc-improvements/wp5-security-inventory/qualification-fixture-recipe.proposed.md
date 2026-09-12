# WP5 — bounded installed-selector fixture recipe

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

**Status:** proposed fixture procedure. No installed Codex Security helper or live scan was run in preparing this recipe. The companion Git/oracle check verifies only the native Git representation and the independent comparison mechanism.

## 1. Safety and ownership

Create a fresh owned standalone local repository with no remote, live workflow, credential or product data. Do not reuse a historical SDLC worktree or modify plugin files. Store expected sets, stderr/stdout, receipts and native helper outputs outside the repository. All commits, file removals and renames in this recipe concern newly created synthetic fixture data only and need the operator's applicable fixture authority. No reset, broad clean, forced worktree operation, upload or CI dispatch is required.

Use an ordinary safe UTF-8 workflow specimen, varying its `name` value when a content change is needed:

```yaml
name: WP5 inventory fixture
on: workflow_dispatch
permissions: {}
jobs:
  inspect:
    runs-on: ubuntu-latest
    steps:
      - run: echo fixture
```

This is never pushed or run. The selector's purpose is file selection, not validation of YAML or Actions semantics. Use a small ordinary Python file for `src/handler.py`. Keep all fixture bytes deterministic and record their digests before native selection.

## 2. F51 — workflow-only committed ranges

Begin with a committed baseline and construct separate candidate states for:

| Case | Change | Independently expected canonical path list |
|---|---|---|
| YML addition | Add `.github/workflows/add.yml` | Exactly `.github/workflows/add.yml` |
| YAML addition | Add `.github/workflows/add.yaml` | Exactly `.github/workflows/add.yaml` |
| YML modification | Change `.github/workflows/modify.yml` | Exactly `.github/workflows/modify.yml` |
| YAML modification | Change `.github/workflows/modify.yaml` | Exactly `.github/workflows/modify.yaml` |

A single fixture lineage may supply successive full base/head pairs. Never reuse a previous output path or compute expectations by calling the native exclusion function. A source-only pre-fix run may demonstrate regression sensitivity but is labelled source-only, not an old installed desktop result.

## 3. F52 — mixed revisions

Use the following deliberate changed-path set:

```text
.github/workflows/build.yml
.github/workflows/review.yaml
src/handler.py
.github/scripts/support.py
.github/actions/local/action.yml
tests/test_handler.py
README.md
.github/workflows/notes.txt
.github/workflows/binary.yml
```

`binary.yml` contains a controlled NUL byte; `notes.txt` uses an extension outside the inspected code-extension list. The independently expected normal post-#820 inventory for these regular-file cases is:

```text
.github/workflows/build.yml
.github/workflows/review.yaml
src/handler.py
```

Treat this as an expectation for the inspected native contract, not a reimplementation of its exclusions. If a later supported installed version has intentionally broader behavior, retain the observed difference and establish its actual documented scope before amending E. Do not change expectations simply because a candidate failed.

The remaining six paths are still in G and need explicit relevance/disposition for a *real* security review. Fixture exclusion is not a declaration that those categories are safe. Run the source-defined legacy path separately only if supported/used; do not generate extra legacy worklists inside a desktop scan.

## 4. F53 — local staged, unstaged and untracked states

At a known baseline with a tracked `existing.yml` and `existing.yaml`, prepare these cases before any helper execution:

| State | Construction | Expected membership |
|---|---|---|
| Staged | Add/change a present workflow and stage it | Present supported path included once |
| Unstaged | Change an already tracked workflow without staging | Present supported path included |
| Untracked | Add a non-ignored workflow without staging | Path included |
| Mixed | All three states, both suffixes | Literal union of those six independently named paths |

Read and retain the native Git staged and working comparisons independently. The mode does not become “staged-only” simply because one file is staged. Keep the owner-coordinated content stable through readback and any later native scan.

## 5. F54 — deletion and rename obligations

| Case | Independent Git obligation | Expected native treatment at inspected source |
|---|---|---|
| Delete `old.yml` | Removed baseline path and content | Eligible deleted path retained |
| Rename `old.yml` to `new.yml` | Both baseline/source and destination identities | Destination row; baseline/source obligation must be separately accounted for |
| Rename `src/old.yml` into workflow tree | Old source and new workflow destination | Destination included; source obligation retained |
| Rename workflow to `docs/archive.txt` | Workflow removal and new destination | Destination can be excluded; do not lose the removed-workflow obligation or call the real target fully covered |

Use native `--no-renames` output for a straightforward complete path obligation set and a second `--find-renames` read for relationships. Neither modifies the repository. Do not secretly disable rename detection in the native helper to make the case pass. Renames whose source content cannot be assessed remain coverage gaps rather than patched inventories.

## 6. F55–F57 — bounded edge cases

Prepare separate controlled cases for staged/working byte differences, staged addition then working-file absence, symlink/type changes where the filesystem/authority supports them, unsupported newline names where creation is valid, Unicode/spaces, deliberately invalid revision, missing executable and output failure. Do not manufacture unreadability by changing production ACLs.

Record expected *failure or limitation* where the native contract cannot support the state. The goal is truthful qualification, not making every arbitrary path look like a supported regular workflow. A path inventory and a byte-for-byte snapshot are distinct artifacts.

For empty control, compare identical committed revisions. Empty inventory is expected; it does not mean the repository has no security issues. For ranking control, use the native general repository-ranking path only where supported; do not assert that canonical non-diff enumeration and repository ranking are the same operation.

For equal-count sensitivity, use two **test-owned lists**, not edited native artifacts:

```text
Expected: .github/workflows/build.yml, src/handler.py
Observed-control: .github/scripts/support.py, src/handler.py
```

The check must report one missing workflow and one unexpected script. A count-only comparator would incorrectly pass.

## 7. Installed invocation and capture

Use the actual installed helper's inspected help and the plan's §7 command patterns. Run canonical revision/local modes against bound full revisions and actual local snapshots. Record executable/runtime/helper identity, exact argv, cwd, exit status, raw streams, output path, literal E, actual I, duplicate/malformed entries and differences.

Use a new output directory every time because the native writer can replace existing inventories. A failed attempt followed by an existing old file is not success. Do not strip arbitrary diagnostics from the native list, normalize case, trim paths, or recreate the native selector's rules locally.

## 8. Desktop confirmation and limits

The native desktop source prepares items from its authoritative scan context and returns paged items. During authorised real work, the native owner must prepare and list all pages; compare the actual target and required path set. Direct helper fixture success does not establish which plugin the desktop loaded, artifact access, source review or native completion.

Retain every result under its actual layer: native Git/oracle mechanics, source helper, installed helper, desktop inventory, assessment coverage, native artifact completion. Do not promote one layer's green result into another.
