# GitHub Guidance

- Prefer the GitHub MCP Server for all GitHub and repository interactions (such as managing issues, pull requests, branches, commits, and repository searches); it provides sandboxed execution, structured payloads, and robust observability.
- **Local Workspace Commits & Pushing**: When asked to commit and push changes in the local repository workspace
  1. Write a GitHub best-practice commit message by performing a diff on each and every uncommitted file and account for every changed section (the writing must contains at least as much detail as the Walkthrough does). Below the message header, write how the user experience will change as a result of these changes. Partition the rest of the commit message as changes per file, ordered by the file paths alphabetically e.g.
```

src\app\css\toolstyle.css
- Modify …

src\app\js\editSidebar.js
- Update …
```
  Use the imperative mood throughout. Only mention net new changes; do not mention fixes for regressions introduced by the code changes themselves. Use a scratch file to upload the commit message.
  2. Perform the add, commit, and push using the local Git CLI (`git add`, `git commit -m "..."`, `git push`). This ensures local workspace files and `.git` refs remain cleanly synchronized.
- **MCP Unavailability**: If the GitHub MCP Server is unavailable for GitHub platform operations, attempt to resolve the cause of the unavailability first, and notify me if you cannot resolve it without my input before falling back to the Git CLI (`git`) or GitHub CLI (`gh`).
- Before creating or modifying branches, pull requests, or issues, use the MCP tools to verify the current state of the repository to prevent merge conflicts or duplicate work.
- When drafting pull request descriptions or issue comments, ensure clear, structured formatting and cross-reference relevant issue numbers directly.
- Avoid executing destructive Git operations (such as force-pushing to protected branches or deleting remote branches) without explicit, case-by-case approval.

# File Reading

- **Internal Tools Only**: You must exclusively use the built-in `read_file`, `list_directory`, `glob`, `grep_search` etc. commands to read files or check for keywords. Use the command `run_command` for this only as a last resort.
- **No Custom Functions**: Do not write, register, or request custom scripts, functions, or MCP servers for basic file reading.

# AWS Guidance

- Prefer the AWS MCP Server for AWS interactions; it provides sandboxed execution, observability, and audit logging. Only if unavailable (attempt to fix the cause of the unavailability first, and notify me if you cannot fix it without my input), use the AWS CLI (`aws`) directly.
- Before starting a task, check whether a relevant AWS skill is available. Load the skill with `retrieve_skill` and prefer its guidance over general knowledge.
- When uncertain about specific AWS details (API parameters, permissions, limits, error codes), verify against documentation rather than guessing. State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework principles.
- Do not use em dashes in AWS resource names or descriptions. Use hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any AWS secret, credential, API key, token, or password task. MUST NOT call `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST NOT hit the Secrets Manager Agent daemon directly. MUST use `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with `asm-exec` so the secret resolves at runtime without entering context.

# Walkthrough Synchronization

- **Always Synchronize Walkthrough**: Always keep the conversation's `walkthrough.md` artifact completely up to date and synchronized with all code, configuration, or architectural changes made in that conversation.
- **Net State & Reverted Experiments Separation**:
  - The main sections of `walkthrough.md` must only describe the net observable code and configuration changes relative to the last commit for each referenced file.
  - Intermediate attempts, tested approaches, or reverted experiments must NOT be listed as active changes in the main sections. Instead, document them in a separate section titled `## Tested & Reverted Experiments` detailing what was tested, the outcome, and why it was reverted.

# Python Guidance

- Only use the local Python environment found in the .venv directory for the execution of Python scripts
