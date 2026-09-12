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
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.cli import PURPOSE_CHOICES, SelectedSource, run_policy_validation  # noqa: E402
from ontology_policy.context import RunPurpose  # noqa: E402

# Centralized target ontology pattern
TARGET_PATTERN = re.compile(
    r"^(iso-31073/iso-31073\.owl"
    r"|iso-iec11179-3/iso-iec11179-3\.owl"
    r"|reference-data/reference-data\.owl"
    r"|core/universal-core\.owl"
    r"|extended/universal-extended\.owl"
    r"|src/iso/31073/ed-[0-9]+/[0-9]{8}"
    r"|src/iso-iec/11179/-3/ed-[0-9]+/(?:[0-9]{8}|v[0-9]+)"
    r"|src/universal/(?:reference-data|core|extended)/[0-9]{8}"
    r"|dist/iso/31073/ed-[0-9]+/.*"
    r"|dist/iso-iec/11179/-3/ed-[0-9]+/.*"
    r"|dist/universal/reference-data/.*"
    r"|dist/universal/core/.*"
    r"|dist/universal/extended/.*)$",
    re.DOTALL,
)

TEST_SCRIPT_PATH = Path("tests/universalontologytest.py")
CURRENT_ONTOLOGY_PATHS = (
    "core/universal-core.owl",
    "extended/universal-extended.owl",
    "reference-data/reference-data.owl",
    "iso-31073/iso-31073.owl",
    "iso-iec11179-3/iso-iec11179-3.owl",
)
VALIDATOR_INPUT_PATHS = frozenset((
    ".github/workflows/ontology-validation.yml",
    "scripts/validate_ontologies.py",
    "tests/universalontologytest.py",
    "tests/test_validate_ontologies.py",
    "requirements.txt",
    ".python-version",
))


def matches_target_ontology_path(file_path: str) -> bool:
    """Match supported source/artifact paths, including documents removed by Git."""
    normalized_path = file_path.replace("\\", "/")
    return "-full" not in normalized_path and TARGET_PATTERN.fullmatch(normalized_path) is not None


def git_output(arguments: list[str]) -> bytes:
    """Run native Git and retain failures rather than treating them as empty diffs."""
    try:
        return subprocess.check_output(["git", *arguments], stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as error:
        detail = error.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Git comparison failed: {detail}") from error


def resolve_git_ref(ref: str) -> str:
    """Resolve the requested commit exactly; never substitute another revision."""
    try:
        return git_output([
            "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}",
        ]).decode("ascii").strip()
    except RuntimeError as error:
        raise RuntimeError(f"Required comparison commit is unavailable: {ref}") from error


def read_git_changes(comparison: list[str]) -> dict[str, str]:
    """Read native NUL-delimited status/path pairs; renames expose both paths."""
    output = git_output([
        "diff", "--name-status", "-z", "--no-renames", "--no-ext-diff",
        "--no-textconv", *comparison, "--",
    ])
    if not output:
        return {}
    fields = output.split(b"\0")
    if fields[-1] != b"" or len(fields) % 2 != 1:
        raise RuntimeError("Git returned incomplete status/path records.")
    changes = {}
    for index in range(0, len(fields) - 1, 2):
        status = fields[index].decode("ascii")
        path = os.fsdecode(fields[index + 1])
        if status not in {"A", "C", "D", "M", "T"} or not path:
            raise RuntimeError(f"Git returned an unresolved change: {status} {path!r}")
        changes[path] = status
    return changes


@dataclass(frozen=True)
class OntologyValidationSelection:
    files: tuple[str, ...]
    removed_files: tuple[str, ...]
    validator_changed: bool
    reason: str
    base: str | None = None
    head: str | None = None

    @property
    def validation_required(self) -> bool:
        return bool(self.files or self.removed_files or self.validator_changed)


def select_ontology_validation(args: argparse.Namespace) -> OntologyValidationSelection:
    """Use one selection contract for pre-install planning and actual validation."""
    base = head = None
    if args.all_current:
        changes = {}
        reason = "Manual validation of the five current ontology sources"
    elif args.staged:
        changes = read_git_changes(["--cached"])
        reason = "Staged Git changes"
    elif args.diff_base:
        base = resolve_git_ref(args.diff_base)
        comparison = [base]
        if args.diff_head:
            head = resolve_git_ref(args.diff_head)
            if resolve_git_ref("HEAD") != head:
                raise RuntimeError("The checkout does not match the requested head revision.")
            comparison.append(head)
        changes = read_git_changes(comparison)
        reason = "Git comparison of ontology and validator inputs"
    else:
        files = args.files
        if not files and not sys.stdin.isatty():
            files = [line.rstrip("\r\n") for line in sys.stdin if line.rstrip("\r\n")]
        changes = dict.fromkeys(files, "M")
        reason = "Explicit ontology paths"

    validator_changed = args.all_current or bool(VALIDATOR_INPUT_PATHS.intersection(changes))
    selected_paths = {path for path in changes if matches_target_ontology_path(path)}
    removed_paths = {path for path in selected_paths if changes[path] == "D"}
    selected_paths.difference_update(removed_paths)
    if validator_changed:
        selected_paths.update(CURRENT_ONTOLOGY_PATHS)
        reason += "; validator inputs select all five current sources"
    missing = sorted(path for path in selected_paths if not Path(path).is_file())
    if missing:
        raise RuntimeError(f"Selected ontology sources are missing or not regular files: {missing!r}")
    return OntologyValidationSelection(
        tuple(sorted(selected_paths)), tuple(sorted(removed_paths)),
        validator_changed, reason, base, head,
    )


def execute_validation(file_path: str, python_exec: str = sys.executable) -> tuple[int, str]:
    """Executes universalontologytest.py on target file."""
    cmd = [python_exec, str(TEST_SCRIPT_PATH), file_path]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return proc.returncode, proc.stdout


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate target ontology files.")
    parser.add_argument("files", nargs="*", help="Specific files to validate")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--staged", action="store_true", help="Validate staged files via git diff --cached")
    mode.add_argument("--diff-base", type=str, help="Base commit ref for git diff")
    mode.add_argument("--all-current", action="store_true", help="Validate the five current ontology sources")
    parser.add_argument("--diff-head", type=str, help="Head commit ref for git diff")
    parser.add_argument("--plan", action="store_true", help="Report applicability without running the invariant checker")
    parser.add_argument("--python-exec", type=str, default=sys.executable, help="Python executable to use for tests")
    parser.add_argument("--github-actions", action="store_true", help="Format failure logs for GitHub Actions annotations")
    parser.add_argument(
        "--purpose", choices=PURPOSE_CHOICES,
        help="Run the canonical SHACL editing policy for this purpose instead of the legacy invariant checker",
    )

    args = parser.parse_args()
    if args.diff_head and not args.diff_base:
        parser.error("--diff-head requires --diff-base")
    if args.files and (args.staged or args.diff_base or args.all_current):
        parser.error("Explicit files cannot be combined with a selection mode")
    if args.diff_base == "":
        parser.error("--diff-base requires a nonempty revision")
    if args.diff_head == "":
        parser.error("--diff-head requires a nonempty revision")

    is_ci = args.github_actions or os.environ.get("GITHUB_ACTIONS") == "true"

    try:
        selection = select_ontology_validation(args)
    except (RuntimeError, OSError) as error:
        print(f"VALIDATION_SELECTION_FAILURE: {error}", file=sys.stderr)
        sys.exit(1)
    print(selection.reason, file=sys.stderr)
    if selection.base:
        print(f"Comparison base={selection.base} head={selection.head or 'working tree'}", file=sys.stderr)
    print(f"Selected ontology files: {list(selection.files)!r}", file=sys.stderr)
    if selection.removed_files:
        print(f"Removed ontology files (not parsed): {list(selection.removed_files)!r}", file=sys.stderr)
    if args.plan:
        print(f"validation_required={str(selection.validation_required).lower()}")
        print(f"validator_changed={str(selection.validator_changed).lower()}")
        sys.exit(0)
    if args.purpose:
        purpose = RunPurpose(args.purpose)
        if args.files and not selection.files:
            print("POLICY_VALIDATION_ERROR (InputError): none of the explicit inputs is a supported ontology source path.", file=sys.stderr)
            sys.exit(2)
        if purpose == RunPurpose.CANDIDATE and not selection.files:
            print("POLICY_VALIDATION_ERROR (ContextError): a candidate run needs at least one selected replacement source.", file=sys.stderr)
            sys.exit(2)
        # The SHACL path validates exact bytes: staged blobs for --staged, the
        # requested head commit for --diff-head, otherwise the working tree.
        revision = "" if args.staged else (selection.head if selection.head else None)
        selected = [SelectedSource(path, revision) for path in selection.files]
        sys.exit(run_policy_validation(purpose, selected, repository=Path.cwd(), github_actions=is_ci))
    if not selection.files:
        if selection.removed_files:
            print("Only removed ontology files were selected; no remaining document was parsed.")
            sys.exit(0)
        print("No target ontology files identified for validation.")
        sys.exit(0)
    if not TEST_SCRIPT_PATH.is_file():
        print(f"CRITICAL_FAILURE: Validation script missing at operational path: {TEST_SCRIPT_PATH}", file=sys.stderr)
        sys.exit(1)
    print(f"Validating {len(selection.files)} target ontology file(s)...")

    validation_failures = 0

    for target_file in selection.files:
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
