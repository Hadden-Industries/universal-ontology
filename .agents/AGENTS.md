# AWS Guidance

- Prefer the AWS MCP Server for AWS interactions; it provides sandboxed execution, observability, and audit logging. Only if unavailable (attempt to fix the cause of the unavailability first, and notify me if you cannot fix it without my input), use the AWS CLI (`aws`) directly.
- Before starting a task, check whether a relevant AWS skill is available. Load the skill with `retrieve_skill` and prefer its guidance over general knowledge.
- When uncertain about specific AWS details (API parameters, permissions, limits, error codes), verify against documentation rather than guessing. State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework principles.
- Do not use em dashes in AWS resource names or descriptions. Use hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any AWS secret, credential, API key, token, or password task. MUST NOT call `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST NOT hit the Secrets Manager Agent daemon directly. MUST use `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with `asm-exec` so the secret resolves at runtime without entering context.

# GitHub Guidance

- Prefer the GitHub MCP Server for all GitHub and repository interactions (such as managing issues, pull requests, branches, commits, and repository searches); it provides sandboxed execution, structured payloads, and robust observability.
- Only use the Git CLI (`git`) or GitHub CLI (`gh`) directly if the GitHub MCP server is unavailable (attempt to resolve the cause of the unavailability first, and notify me if you cannot resolve it without my input).
- Before creating or modifying branches, pull requests, or issues, use the MCP tools to verify the current state of the repository to prevent merge conflicts or duplicate work.
- When drafting pull request descriptions or issue comments, ensure clear, structured formatting and cross-reference relevant issue numbers directly.
- Avoid executing destructive Git operations (such as force-pushing to protected branches or deleting remote branches) without explicit, case-by-case approval.

# File Reading

- **Internal Tools Only**: You must exclusively use the built-in `read_file`, `list_directory`, `glob`, `grep_search` etc. commands to read files or check for keywords. Use the command `run_command` for this only as a last resort.
- **No Custom Functions**: Do not write, register, or request custom scripts, functions, or MCP servers for basic file reading.

# Python Guidance

- Only use the local Python environment found in the .venv directory for the execution of Python scripts
