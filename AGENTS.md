# GitHub Guidance

## Local Workspace Commits & Pushing

- For any request to draft a commit message or commit current workspace changes, you MUST load and follow the `committing-to-git` skill.

- **Explicit User Authorization**:
  - Creating a commit requires explicit user authorization.
  - Pushing requires separate explicit user authorization.
  - A request to push existing commits MUST NOT implicitly authorize staging or committing uncommitted workspace changes.

## GitHub MCP Server

- Prefer the GitHub MCP Server for all GitHub and repository interactions (such as managing issues, pull requests, branches, managing commits (not creating them - use the "Local Workspace Commits & Pushing" guidance above), and repository searches); it provides sandboxed execution, structured payloads, and robust observability.

- **MCP Unavailability**: If the GitHub MCP Server is unavailable for GitHub platform operations, attempt to resolve the cause of the unavailability first, and notify me if you cannot resolve it without my input before falling back to the Git CLI (`git`) or GitHub CLI (`gh`).
- Before creating or modifying branches, pull requests, or issues, use the MCP tools to verify the current state of the repository to prevent merge conflicts or duplicate work.
- When drafting pull request descriptions or issue comments, ensure clear, structured formatting and cross-reference relevant issue numbers directly.
- Avoid executing destructive Git operations (such as force-pushing to protected branches or deleting remote branches) without explicit, case-by-case approval.

# File Operations & Search

- **Internal Tools Only**: You must exclusively use built-in tools (e.g. `list_dir`, `grep_search`, `view_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`, etc.) to view, search, read, or modify files. Use `run_command` for file operations only as a last resort.
- **No Custom Functions**: Do not write, register, or request custom scripts, functions, or MCP servers for basic file reading, searching, or editing.

# Command Execution & Chaining

- **Strict Single-Command Execution**: You MUST execute shell commands individually, one command per execution block or action turn. 
- **Banned Operators**: NEVER use sequential chaining, logical operators, or command substitution (e.g., `;`, `&&`, `||`, `|`, `&`, `$()`, `` ` ``).
- **Execution Rationale**:
  - **Environment Security**: The host environment parses commands against strict allow/deny lists. Chaining or nesting commands obscures the execution intent and will trigger security blocks or parser failures.
  - **State Validation**: You must evaluate the exit code, standard error (stderr), and standard output (stdout) of a command before determining the next action. Chained operators bypass this cognitive pause, causing cascading failures if a prerequisite command fails.
- **Examples**:
  - **INCORRECT**: `git status; git diff`
  - **INCORRECT**: `npm run build && npm test`
  - **INCORRECT**: `cat $(find . -name "*.txt")`
  - **CORRECT**: Execute `git status`, await the system response and exit code, and only then execute `git diff`.

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
