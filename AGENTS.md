# Repository Instructions

## Configuration Safety

- NEVER create, modify, rename, or delete configuration files without the user's explicit approval for the exact change.
- Other approvals do not imply approval to change configuration.
- Configuration files include build, bundler, package, lockfile, lint, formatting, test, CI/CD, container, deployment, hosting, environment, and repository-policy files.
- Before requesting approval, identify the exact file and setting, explain the behavioral and pipeline impact, and propose the smallest change.
- If a task appears to require a configuration change, stop and request approval instead of inferring permission.

# Git Guidance

## Local Workspace Commits & Pushing

- For any request to draft a commit message or commit current workspace changes, you MUST load and follow the `committing-to-git` skill. Unless specified otherwise, use the template for a per-file detailed commit message when drafting a commit message.

- **Explicit User Authorization**:
  - Creating a commit requires explicit user authorization.
  - Pushing requires separate explicit user authorization.
  - A request to push existing commits MUST NOT implicitly authorize staging or committing uncommitted workspace changes.

## Working Tree Safety

Treat all existing working-tree changes as user-owned and potentially valuable.

- Use the current working-tree contents as the authoritative starting point for ordinary file editing.
- Preserve all pre-existing modifications unless the user explicitly requests that they be changed or discarded.
- Treat any change you did not make as deliberate, including content that was present earlier in the session and is now absent. Never restore it, and do not assume a regression, a sync artefact, or a tooling bug; raise it and ask if it materially affects work in progress.
- Edit files directly using minimal, targeted changes.
- Never use `git checkout`, `git restore`, `git reset --hard`, or another Git restoration operation to undo edits made during the current task.
- To undo your own changes, reverse only the specific edits you introduced.
- Use Git primarily to inspect repository state and historical content (`git status`, `git diff`, `git show`) during ordinary editing.
- Execute operations that discard working-tree changes only when the user explicitly requests that destructive operation.

# GitHub Platform Guidance

- Avoid executing destructive Git operations (such as force-pushing to protected branches or deleting remote branches) without explicit, case-by-case approval.

# Python Guidance

- Only use the local Python environment found in the .venv directory for the execution of Python scripts

# Repository-owned SDLC

- Read [the repository SDLC guide](docs/sdlc/howto.md) and, for material work, [the engineering principles](docs/sdlc/engineering-principles.md). The current user-approved task is the authority; reuse recorded approvals within their scope.
- Select the smallest justified R0/R1/R2/R3 route. R0/R1 may use the accepted task or PR brief; R2/R3 require a previously accepted baseline for ordinary work. Do not create extra Issues, plans or reviewers merely to fill a template.
- Select the repository-adapted `test-driven-development` from `.sdlc/skills` (activated in `.agents/skills`) as the sole implementation procedure. Do not combine it with a global or upstream TDD copy. Existing discovery/design skills retain their bounded purposes; all six SDLC skills are explicitly selected only when relevant. Installed roles do not authorize delegation against user limits.
- Require semantically correct, precise names, including reassessment of retained names when responsibility changes. Do not introduce or extend shims without a specific prior user override. Do not rename a shim to conceal its purpose.
- Before new functionality or material integration changes, research existing and maintained alternatives deeply; compare supported configuration, composition and extension. Select current stable or the latest patch of the newest applicable supported LTS line first; inspect exact licences, riders and rights decisions. Record the residual custom gap; integration difficulty does not justify downgrade.
- Use consumer-owned parsers, schemas and validators, then check the higher-level ontology/product outcome independently. A schema, reference, checked box or passing test is not evidence of human acceptance or semantic correctness.
- Use `npm run ...` entry points for routine controls; Python runs through the existing `.venv`. Inspect lifecycle side effects before executing commands. `npm run build` invokes auto-fixes; use the documented direct Vite command when verification must preserve tracked inputs. Deployment remains separately authorized.
- Retain truthful failures and proof gaps. Follow [REVIEW.md](REVIEW.md), native Codex Security workflows when authorized, and existing command protections. Installation, trust, live scans, GitHub writes, commits and pushing are distinct actions; repository integration does not authorize them by itself.
- Remove only spent task-owned temporary artifacts after checking remaining consumers and retention; never delete failed evidence to manufacture completion.
- SDLC status remains **1.0.0, pre-release, not deployed** until Max explicitly confirms deployment. Apply the method to real work; no synthetic adoption pilot or cross-repository distribution platform is required.
