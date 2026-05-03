#!/bin/sh
# WHY: /bin/sh is the only universally guaranteed alias in Git for Windows MSYS2. 
# Bypasses the /usr/bin/env resolution vulnerability on strict Windows environments.

set -eu
# Fail fast on pipeline errors if supported by the host shell
set -o pipefail 2>/dev/null || true 

readonly TARGET_HOOKS_DIR=".githooks"

execute_git_configuration_bind() {
    # Guard clause: Dependency validation
    if ! command -v git >/dev/null 2>&1; then
        printf "CRITICAL_FAILURE: Git executable not detected in PATH.\n" >&2
        exit 1
    fi

    # Context Anchor: Resolve absolute physical directory of the executing script.
    # WHY: Handles symlinks and execution from arbitrary relative paths across POSIX systems.
    local script_dir
    script_dir=$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)

    if [ -z "${script_dir}" ]; then
        printf "CRITICAL_FAILURE: Execution context unbound.\n" >&2
        exit 1
    fi

    local repo_root
    set +e
    repo_root=$(git -C "${script_dir}" rev-parse --show-toplevel 2>/dev/null)
    local git_exit_code=$?
    set -e

    if [ ${git_exit_code} -ne 0 ] || [ -z "${repo_root}" ]; then
        printf "CRITICAL_FAILURE: Unable to resolve Git repository root.\n" >&2
        exit 1
    fi

    cd "${repo_root}" || exit 1

    # Idempotent directory provisioning
    if [ ! -d "${TARGET_HOOKS_DIR}" ]; then
        printf "PROVISIONING: Initializing %s directory boundary...\n" "${TARGET_HOOKS_DIR}"
        mkdir -p "${TARGET_HOOKS_DIR}"
    fi

    # Construct strict absolute path.
    # WHY: Prevents execution context drift when sub-module operations alter the CWD.
    local absolute_hook_path="${repo_root}/${TARGET_HOOKS_DIR}"

    printf "BINDING: Re-routing execution vector core.hooksPath to %s...\n" "${absolute_hook_path}"
    
    # Configuration overwrite (idempotent)
    git config core.hooksPath "${absolute_hook_path}"

    printf "PERMISSION_ENFORCEMENT: Granting POSIX execution bits to hook payloads...\n"
    
    # Idempotent permission enforcement on physical files and the Git tracking index.
    # Errors suppressed to prevent pipeline failure if payloads are not yet staged.
    chmod +x "${TARGET_HOOKS_DIR}/"* 2>/dev/null || true
    git update-index --chmod=+x "${TARGET_HOOKS_DIR}/"* 2>/dev/null || true

    printf "SUCCESS: Repository initialization sequence complete.\n"
}

execute_git_configuration_bind