# GitHub Guidance

## Local Workspace Commits & Pushing

When asked to commit, push, or draft a commit message in the local repository workspace, follow this strict, mandatory workflow:

### 1. Pre-Commit Verification Workflow
1. **Mandatory Execution Order**: You MUST FIRST execute `git status` then `git diff` to inspect the active uncommitted working tree diff.
2. **Strict Scope Enforcement**: Base the commit message's technical scope and file modifications EXCLUSIVELY on the active `git diff` output.
   - DO NOT fabricate file changes or list features drawn from conversation history, memory of earlier edits, or past prompts.
   - YOU MAY use conversation history solely to explain the rationale or context behind the changes (the "why"), provided it strictly aligns with the actual diff.
   - DO NOT list files, features, or fixes that are already committed in previous commits, even if they were part of the same task session.
   - DO NOT mention fixes for intermediate regressions or syntax errors introduced during your own uncommitted edits.

### 2. Commit Message Structure & Formatting Rules
1. **Imperative Mood Throughout**: Use the imperative, present-tense mood across **all** sections (e.g., "Fix", "Add", "Update", "Suppress" — NEVER "Fixed", "Added", "Updates", or "Suppressing").
2. **Subject Line (Header) Rules**:
   - Format: `<type>(<scope>): <Imperative summary>` (e.g., `fix(ui): Suppress long-press menu on UI controls`).
   - Length: Target **~50 characters**, and **NEVER exceed 72 characters**.
   - Formatting: Capitalize the first word after type/scope; do NOT end with a period (`.`).
3. **Blank Line Delimiters**: Separate the header, the `User Experience Changes` section, and the file breakdown with **exactly one blank line**.
4. **Body Line Wrapping**: Wrap body text, descriptions, and bullet points at **72 characters** per line for terminal readability.
5. **Per-File Breakdown Rules**:
   - Order file paths **alphabetically** using relative workspace paths (e.g., `src/app/css/toolstyle.css`).
   - Detail line-by-line additions and deletions in the imperative mood.
   - **Nested Sub-Bullets**: When a file contains multiple distinct changes or complex diffs, use indented sub-bullets beneath the file heading for enhanced readability.

### 3. Commit Message Review
1. **Ask For Review**: Prompt the user to review the proposed commit message before proceeding - await explicit consent to proceed
2. **Iterate**: If there is no explicit consent to proceed, alter the proposed commit message to satisfy the user's requirements until the user confirms that it can be used in the commit

### 4. Execution Commands
1. **Scratch File**: Write the reviewed commit message to a scratch file in your conversation artifacts scratch directory (`scratch/commit_msg.txt` in your artifact directory outside the workspace repository). Never create scratch files inside the repository working tree to avoid accidental staging or triggering Git file watchers.
2. **Local Git CLI Execution**: To ensure local workspace files and `.git` refs remain cleanly synchronized, run the following local Git CLI commands in order:
   1. `git add .`
   2. `git commit -S -F {file path to scratch/commit_msg.txt}`
   3. `git verify-commit HEAD` to verify that the commit has been signed - ensure the command returns returns a standard system exit code: 0
   4. `git push`

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
