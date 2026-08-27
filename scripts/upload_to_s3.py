#!/usr/bin/env python3
"""
Python runner to upload compiled static web assets to AWS S3.
"""

import argparse
import subprocess
import sys
from pathlib import Path


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

    # Resolve script directory dynamically
    script_dir = Path(__file__).resolve().parent
    upload_script = (script_dir / "../../amazon-aws/scripts/upload_to_s3.py").resolve()

    if not upload_script.is_file():
        print(f"[ERROR] Helper script not found at '{upload_script}'", file=sys.stderr)
        sys.exit(1)

    local_directory = (script_dir / "../dist/").resolve()
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
