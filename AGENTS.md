# Repository Instructions

## Configuration Safety

- NEVER create, modify, rename, or delete configuration files without the user's explicit approval for the exact change.
- Other approvals do not imply approval to change configuration.
- Configuration files include build, bundler, package, lockfile, lint, formatting, test, CI/CD, container, deployment, hosting, environment, and repository-policy files.
- Before requesting approval, identify the exact file and setting, explain the behavioral and pipeline impact, and propose the smallest change.
- If a task appears to require a configuration change, stop and request approval instead of inferring permission.

# Git Guidance

## Local Workspace Commits & Pushing

- For any request to draft a commit message or commit current workspace changes, you MUST load and follow the `committing-to-git` skill.

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

## GitHub MCP Server

- Prefer the GitHub MCP Server for GitHub platform operations, such as managing issues, pull requests, remote branches, repository metadata, and GitHub-hosted searches. Use local repository tools and Git for operations involving the current working tree, index, local branches, commits, or repository state.

- **MCP Unavailability**: If the GitHub MCP Server is unavailable for GitHub platform operations, diagnose the cause first using non-destructive inspection. Do not modify configuration or connections without the approval required by the Configuration Safety rules. If the issue cannot be resolved without such changes, notify me before falling back to the Git CLI (`git`) or GitHub CLI (`gh`).
- Before creating or modifying pull requests, issues, or remote branches through GitHub, use the MCP tools to verify the relevant remote repository state to prevent merge conflicts or duplicate work.

# Python Guidance

- Only use the local Python environment found in the .venv directory for the execution of Python scripts
