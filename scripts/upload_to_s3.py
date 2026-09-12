#!/usr/bin/env python3
"""
Python runner to upload compiled static web assets to AWS S3.

Publication is gated: the exact active ontology artifacts must carry a current
qualification receipt from the SHACL editing policy, and their derived dist/
copies must match those bytes, or nothing is uploaded.
"""

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.publication import PublicationRefusal, check_repository_publication  # noqa: E402

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
            capture_output=True, text=True, check=True, encoding="utf-8",
        ).stdout.strip()
        main_repository = (repository_root / common).resolve().parent
        candidates.append(main_repository.parent / HELPER_RELATIVE_PATH)
    except (OSError, subprocess.CalledProcessError):
        pass
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return candidates[0]


HELPER_SCRIPT_PATH = locate_helper_script()


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


def build_upload_command(
    upload_script: Path,
    local_directory: Path,
    *,
    force: bool,
) -> list[str]:
    """Build the underlying amazon-aws upload-helper command."""
    command = [
        sys.executable,
        str(upload_script),
        str(local_directory),
        "--region", "eu-west-1",
        "--bucket", "haddenindustries-com-static-assets",
        "--prefix", "ontology",
        "--exclude", "external/*.url",
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
    print(f"Publication gate: {verdict.receipt_purpose} qualification covers {len(verdict.bound_artifacts)} active artifact(s); policy {verdict.policy_identity}.")

    local_directory = (SCRIPT_DIRECTORY / "../dist/").resolve()
    command = build_upload_command(
        upload_script,
        local_directory,
        force=args.force,
    )

    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)

    print("SUCCESS: S3 upload completed successfully.")


if __name__ == "__main__":
    main()
