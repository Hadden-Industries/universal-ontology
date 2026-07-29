#!/usr/bin/env python3
"""
Ontology Validation Runner
Centralized script for filtering target ontology files and executing validation tests.
Used by both Git pre-commit hooks and GitHub Actions CI pipelines to ensure DRY compliance.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# Centralized target ontology pattern
TARGET_PATTERN = re.compile(
    r"^(iso-31073/iso-31073\.owl"
    r"|iso-iec11179-3/iso-iec11179-3\.owl"
    r"|reference-data/reference-data\.owl"
    r"|core/universal-core\.owl"
    r"|extended/universal-extended\.owl"
    r"|dist/iso/31073/ed-[0-9]+/.*"
    r"|dist/iso-iec/11179/-3/ed-[0-9]+/.*"
    r"|dist/universal/reference-data/.*"
    r"|dist/universal/core/.*"
    r"|dist/universal/extended/.*)$"
)

TEST_SCRIPT_PATH = Path("tests/universalontologytest.py")
GIT_EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


def is_target_ontology(file_path_str: str) -> bool:
    """
    Checks whether a file path matches the target ontology criteria.
    - Normalizes Windows backslashes to forward slashes for pattern matching.
    - Excludes files containing '-full'.
    - Verifies file existence on disk.
    """
    normalized_path = file_path_str.replace("\\", "/").strip()
    if not normalized_path:
        return False

    if "-full" in normalized_path:
        return False

    if not TARGET_PATTERN.match(normalized_path):
        return False

    if not os.path.isfile(normalized_path):
        return False

    return True


def get_staged_files() -> list[str]:
    """Retrieves list of staged files from git diff --cached."""
    cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"]
    try:
        output = subprocess.check_output(cmd).decode("utf-8", errors="replace")
        return [f for f in output.split("\0") if f]
    except subprocess.CalledProcessError as e:
        print(f"Error retrieving staged files: {e}", file=sys.stderr)
        return []


def resolve_git_ref(ref: str) -> str:
    """Verifies if a git ref is valid; if invalid, attempts HEAD^ fallback."""
    try:
        subprocess.check_call(
            ["git", "rev-parse", "--verify", f"{ref}^{{commit}}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return ref
    except subprocess.CalledProcessError:
        # Try HEAD^
        try:
            subprocess.check_call(
                ["git", "rev-parse", "--verify", "HEAD^"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return "HEAD^"
        except subprocess.CalledProcessError:
            return GIT_EMPTY_TREE


def get_diff_files(base_ref: str, head_ref: str | None = None) -> list[str]:
    """Retrieves list of modified files between base_ref and head_ref."""
    resolved_base = resolve_git_ref(base_ref)
    cmd = ["git", "diff", "--name-only", "--diff-filter=ACM", "-z", resolved_base]
    if head_ref:
        cmd.append(head_ref)

    try:
        output = subprocess.check_output(cmd).decode("utf-8", errors="replace")
        return [f for f in output.split("\0") if f]
    except subprocess.CalledProcessError as e:
        print(f"Error retrieving diff files: {e}", file=sys.stderr)
        return []


def execute_validation(file_path: str, python_exec: str = sys.executable) -> tuple[int, str]:
    """Executes universalontologytest.py on target file."""
    cmd = [python_exec, str(TEST_SCRIPT_PATH), file_path]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return proc.returncode, proc.stdout


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate target ontology files.")
    parser.add_argument("files", nargs="*", help="Specific files to validate")
    parser.add_argument("--staged", action="store_true", help="Validate staged files via git diff --cached")
    parser.add_argument("--diff-base", type=str, help="Base commit ref for git diff")
    parser.add_argument("--diff-head", type=str, help="Head commit ref for git diff")
    parser.add_argument("--python-exec", type=str, default=sys.executable, help="Python executable to use for tests")
    parser.add_argument("--github-actions", action="store_true", help="Format failure logs for GitHub Actions annotations")

    args = parser.parse_args()

    if not TEST_SCRIPT_PATH.exists():
        print(f"CRITICAL_FAILURE: Validation script missing at operational path: {TEST_SCRIPT_PATH}", file=sys.stderr)
        sys.exit(1)

    is_ci = args.github_actions or os.environ.get("GITHUB_ACTIONS") == "true"

    candidate_files: list[str] = []

    if args.staged:
        candidate_files.extend(get_staged_files())
    elif args.diff_base:
        candidate_files.extend(get_diff_files(args.diff_base, args.diff_head))
    elif args.files:
        candidate_files.extend(args.files)
    else:
        # Fallback to reading lines from stdin if available
        if not sys.stdin.isatty():
            for line in sys.stdin:
                line = line.strip()
                if line:
                    candidate_files.append(line)

    target_files = [f for f in candidate_files if is_target_ontology(f)]

    if not target_files:
        print("No target ontology files identified for validation.")
        sys.exit(0)

    print(f"Validating {len(target_files)} target ontology file(s)...")

    validation_failures = 0

    for target_file in target_files:
        code, output = execute_validation(target_file, python_exec=args.python_exec)
        if output.strip() or code != 0:
            validation_failures += 1
            if is_ci:
                print(f"::error file={target_file}::Constraint violations detected in {target_file}")
                print(output)
            else:
                print(f"VALIDATION_FAILURE: {target_file}", file=sys.stderr)
                print("-" * 50, file=sys.stderr)
                print(output, file=sys.stderr)
                print("-" * 50, file=sys.stderr)

    if validation_failures > 0:
        if is_ci:
            print(f"::error::Pipeline aborted. {validation_failures} ontology payload(s) breached constraints.")
        else:
            print(f"ABORT: {validation_failures} ontology validation(s) failed. Remediate issues before committing.", file=sys.stderr)
        sys.exit(1)

    print("All target ontology files passed validation.")
    sys.exit(0)


if __name__ == "__main__":
    main()
