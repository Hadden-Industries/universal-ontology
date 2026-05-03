#!/usr/bin/env bash
# Enforce strict execution context: fail on error, fail on unbound variable, fail on pipeline errors.
set -euo pipefail

readonly TARGET_HOOKS_DIR=".githooks"

execute_git_configuration_bind() {
    # 1. Precondition Validation
    if ! command -v git >/dev/null 2>&1; then
        printf "CRITICAL_FAILURE: Git executable not detected in PATH. Dependency validation failed.\n" >&2
        exit 1
    fi

    # 2. Context Anchor: Resolve absolute physical directory of the executing script
    # Handles symlinks and execution from arbitrary relative paths
    local script_dir
    script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

    if [[ -z "${script_dir}" ]]; then
        printf "CRITICAL_FAILURE: Execution context unbound. Runtime failed to resolve physical script path.\n" >&2
        exit 1
    fi

    # 3. Context Resolution: Dynamically resolve repository root
    local repo_root
    # Temporarily disable set -e to handle git rev-parse failure gracefully
    set +e
    repo_root=$(git -C "${script_dir}" rev-parse --show-toplevel 2>/dev/null)
    local git_exit_code=$?
    set -e

    if [[ ${git_exit_code} -ne 0 || -z "${repo_root}" ]]; then
        printf "CRITICAL_FAILURE: Execution context boundary violation. Unable to resolve Git repository root from %s.\n" "${script_dir}" >&2
        exit 1
    fi

    # 4. Context Mutation: Shift execution to the verified repository root
    cd "${repo_root}" || {
        printf "CRITICAL_FAILURE: Unable to mutate execution context to %s.\n" "${repo_root}" >&2
        exit 1
    }

    # 5. Idempotent Provisioning
    if [[ ! -d "${TARGET_HOOKS_DIR}" ]]; then
        printf "PROVISIONING: Initializing %s directory boundary...\n" "${TARGET_HOOKS_DIR}"
        mkdir -p "${TARGET_HOOKS_DIR}"
    fi

    # 6. Configuration Binding & Post-Execution Validation
    printf "BINDING: Re-routing execution vector core.hooksPath to %s...\n" "${TARGET_HOOKS_DIR}"
    
    set +e
    git config core.hooksPath "${TARGET_HOOKS_DIR}"
    local config_exit_code=$?
    set -e

    if [[ ${config_exit_code} -ne 0 ]]; then
        printf "CRITICAL_FAILURE: Git configuration mutation failed during execution phase.\n" >&2
        exit 1
    fi

    printf "SUCCESS: Repository initialization sequence complete. Deterministic hook constraints applied.\n"
}

execute_git_configuration_bind