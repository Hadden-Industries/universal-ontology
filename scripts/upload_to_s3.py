#!/usr/bin/env python3
"""
Python runner to upload compiled static web assets to AWS S3.

Publication is gated: the exact active ontology artifacts must carry a current
qualification receipt from the SHACL editing policy, and their derived dist/
copies must match those bytes, or nothing is uploaded.
"""

import argparse
import hashlib
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.publication import (  # noqa: E402
    PublicationRefusal,
    check_repository_publication,
)

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
HELPER_RELATIVE_PATH = Path("amazon-aws/scripts/upload_to_s3.py")


def locate_helper_script(repository_root: Path = SCRIPT_DIRECTORY.parent) -> Path:
    """The amazon-aws helper is a sibling of the main repository checkout.

    A linked worktree lives elsewhere (for example under
    ``universal-ontology-worktrees/``), so the sibling of the Git common
    directory's repository is tried when the sibling of this checkout is absent.
    """
    candidates = [repository_root.parent / HELPER_RELATIVE_PATH]
    try:
        common = subprocess.run(
            ["git", "-C", str(repository_root), "rev-parse", "--git-common-dir"],
            capture_output=True,
            text=True,
            check=True,
            encoding="utf-8",
        ).stdout.strip()
        main_repository = (repository_root / common).resolve().parent
        candidates.append(main_repository.parent / HELPER_RELATIVE_PATH)
    except OSError, subprocess.CalledProcessError:
        pass
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return candidates[0]


HELPER_SCRIPT_PATH = locate_helper_script()


def _tree_identity(root: Path) -> dict[str, str]:
    """Capture all upload bytes, refusing links before copying or invoking the helper."""
    if root.is_symlink() or root.is_junction():
        raise PublicationRefusal(f"Linked upload root: {root}")
    identity = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or path.is_junction():
            raise PublicationRefusal(f"Linked upload candidate: {path}")
        if path.is_file():
            identity[path.relative_to(root).as_posix()] = hashlib.sha256(
                path.read_bytes()
            ).hexdigest()
    return identity


def prepare_publication_candidate(
    repository: Path,
) -> tuple[Path, Path, dict[str, str]]:
    """Snapshot the complete built tree and reject mutation during preparation; never regenerate."""
    live = repository / "dist"
    before = _tree_identity(live)
    parent = repository / ".sdlc/runtime/policy-reports/publication-candidates"
    for component in (parent, *parent.parents):
        if component.is_symlink() or component.is_junction():
            raise PublicationRefusal(
                f"Linked publication snapshot directory: {component}"
            )
        if component == repository:
            break
    parent.mkdir(parents=True, exist_ok=True)
    owned = Path(tempfile.mkdtemp(prefix="website-", dir=parent))
    candidate = owned / "dist"
    # Failed candidates remain available for diagnosis; they are never passed to the upload helper.
    shutil.copytree(live, candidate)
    if before != _tree_identity(live) or before != _tree_identity(candidate):
        raise PublicationRefusal(
            "Website output changed while preparing the upload snapshot."
        )
    check_repository_publication(repository=repository, dist_directory=candidate)
    return owned, candidate, before


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse repository-specific deployment options."""
    parser = argparse.ArgumentParser(
        description="Deploy compiled ontology website assets to AWS S3."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "Upload every local file regardless of its remote checksum. "
            "Does not enable complete remote deletion or relax deletion safeguards."
        ),
    )
    return parser.parse_args(argv)


def helper_interpreter(upload_script: Path) -> str:
    """The interpreter that carries the helper's own dependencies (awscrt).

    The amazon-aws repository keeps them in its ``.venv``; this repository's
    environment is hash-locked to the ontology toolchain and deliberately does
    not carry them. Fall back to the current interpreter when that venv is absent.
    """
    repository = upload_script.resolve().parent.parent
    for candidate in (
        repository / ".venv" / "Scripts" / "python.exe",
        repository / ".venv" / "bin" / "python",
    ):
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def build_upload_command(
    upload_script: Path,
    local_directory: Path,
    *,
    force: bool,
    interpreter: str | None = None,
) -> list[str]:
    """Build the underlying amazon-aws upload-helper command."""
    command = [
        interpreter or sys.executable,
        str(upload_script),
        str(local_directory),
        "--region",
        "eu-west-1",
        "--bucket",
        "haddenindustries-com-static-assets",
        "--prefix",
        "ontology",
        "--exclude",
        "external/*.url",
        "--invalidate-cloudfront",
        "--delete",
    ]

    if force:
        command.extend(["--compare-mode", "force"])

    return command


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    upload_script = HELPER_SCRIPT_PATH
    if not upload_script.is_file():
        print(f"[ERROR] Helper script not found at '{upload_script}'", file=sys.stderr)
        sys.exit(1)

    try:
        verdict = check_repository_publication()
    except PublicationRefusal as refusal:
        print(f"PUBLICATION_REFUSED: {refusal}", file=sys.stderr)
        sys.exit(2)
    print(
        f"Publication gate: {verdict.receipt_purpose} qualification covers {len(verdict.bound_artifacts)} active artifact(s); policy {verdict.policy_identity}."
    )

    try:
        owned, local_directory, candidate_identity = prepare_publication_candidate(
            SCRIPT_DIRECTORY.parent
        )
    except (PublicationRefusal, OSError) as refusal:
        print(f"PUBLICATION_REFUSED: {refusal}", file=sys.stderr)
        sys.exit(2)
    command = build_upload_command(
        upload_script,
        local_directory,
        force=args.force,
        interpreter=helper_interpreter(upload_script),
    )

    try:
        # Recheck the isolated candidate immediately before starting the external helper.
        check_repository_publication(
            repository=SCRIPT_DIRECTORY.parent, dist_directory=local_directory
        )
        if _tree_identity(local_directory) != candidate_identity:
            raise PublicationRefusal(
                "The sealed upload snapshot changed before upload."
            )
        subprocess.run(command, check=True)
    except PublicationRefusal as refusal:
        print(f"PUBLICATION_REFUSED: {refusal}", file=sys.stderr)
        sys.exit(2)
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)

    shutil.rmtree(owned)

    print("SUCCESS: S3 upload completed successfully.")


if __name__ == "__main__":
    main()
