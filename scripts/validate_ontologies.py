#!/usr/bin/env python3
"""
Ontology Validation Runner
Selects the ontology sources a change touches and runs the SHACL editing policy
(scripts/ontology_policy) on them for the requested purpose. Used by the Git
pre-commit hook, GitHub Actions and the SDLC profiles so that one selection
contract and one policy apply everywhere. There is no other validator.
"""

import argparse
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# The SHACL package (rdflib, pySHACL) is imported only when validation actually
# runs, so pre-install planning (--plan) keeps working in a bare interpreter.
PURPOSE_CHOICES = ("latest-active", "candidate", "draft", "critical-fix")
DEFAULT_PURPOSE = "draft"  # diagnostic: reports every violation, never qualifies activation

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

CURRENT_ONTOLOGY_PATHS = (
    "core/universal-core.owl",
    "extended/universal-extended.owl",
    "reference-data/reference-data.owl",
    "iso-31073/iso-31073.owl",
    "iso-iec11179-3/iso-iec11179-3.owl",
)
# A change to any of these alters what "valid" means, so every current source
# is re-validated: the runner and its contract test, the policy graphs and
# authority snapshots, the engine package, and the pinned toolchain.
VALIDATOR_INPUT_PATHS = frozenset((
    ".github/workflows/ontology-validation.yml",
    "scripts/validate_ontologies.py",
    "tests/test_validate_ontologies.py",
    "requirements.txt",
    "requirements.lock.txt",
    ".python-version",
    ".java-version",
))
VALIDATOR_INPUT_PREFIXES = ("policy/", "scripts/ontology_policy/")


def is_validator_input(path: str) -> bool:
    normalized = path.replace("\\", "/")
    return normalized in VALIDATOR_INPUT_PATHS or normalized.startswith(VALIDATOR_INPUT_PREFIXES)


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

    validator_changed = args.all_current or any(is_validator_input(path) for path in changes)
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate target ontology files.")
    parser.add_argument("files", nargs="*", help="Specific files to validate")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--staged", action="store_true", help="Validate staged files via git diff --cached")
    mode.add_argument("--diff-base", type=str, help="Base commit ref for git diff")
    mode.add_argument("--all-current", action="store_true", help="Validate the five current ontology sources")
    parser.add_argument("--diff-head", type=str, help="Head commit ref for git diff")
    parser.add_argument("--plan", action="store_true", help="Report applicability without running the editing policy")
    parser.add_argument("--github-actions", action="store_true", help="Format failure logs for GitHub Actions annotations")
    parser.add_argument(
        "--purpose", choices=PURPOSE_CHOICES, default=DEFAULT_PURPOSE,
        help="Purpose of the editing-policy run (default: draft diagnostics, which never qualify activation)",
    )
    parser.add_argument("--authorities", type=Path, default=None, help="Directory of pinned authority snapshots (default policy/authorities)")
    parser.add_argument("--critical-fix-scope", help="Approved scope reference for a critical-fix run")
    parser.add_argument("--report-directory", type=Path, default=None, help="Where native policy reports and receipts are retained")

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
    if args.files and not selection.files:
        print("POLICY_VALIDATION_ERROR (InputError): none of the explicit inputs is a supported ontology source path.", file=sys.stderr)
        sys.exit(2)
    if not selection.files and args.purpose != "latest-active":
        if selection.removed_files:
            print("Only removed ontology files were selected; no remaining document was parsed.")
            sys.exit(0)
        if args.purpose == "candidate":
            print("POLICY_VALIDATION_ERROR (ContextError): a candidate run needs at least one selected replacement source.", file=sys.stderr)
            sys.exit(2)
        print("No target ontology files identified for validation.")
        sys.exit(0)

    from ontology_policy.cli import SelectedSource, run_policy_validation
    from ontology_policy.context import RunPurpose

    # The policy validates exact bytes: staged blobs for --staged, the requested
    # head commit for --diff-head, otherwise the working tree.
    revision = "" if args.staged else (selection.head if selection.head else None)
    selected = [SelectedSource(path, revision, selection.base) for path in selection.files]
    extra = {"report_directory": args.report_directory} if args.report_directory else {}
    if args.authorities:
        extra["authorities_directory"] = args.authorities
    sys.exit(run_policy_validation(
        RunPurpose(args.purpose), selected, repository=Path.cwd(), github_actions=is_ci,
        scope_reference=args.critical_fix_scope, **extra,
    ))


if __name__ == "__main__":
    main()
