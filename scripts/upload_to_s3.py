#!/usr/bin/env python3
"""
Python runner to upload compiled static web assets to AWS S3.
"""

import subprocess
import sys
from pathlib import Path


def main():
    # Resolve script directory dynamically
    script_dir = Path(__file__).resolve().parent
    upload_script = (script_dir / "../../amazon-aws/scripts/upload_to_s3.py").resolve()

    if not upload_script.is_file():
        print(f"[ERROR] Helper script not found at '{upload_script}'", file=sys.stderr)
        sys.exit(1)

    local_dir = (script_dir / "../dist/").resolve()
    region = "eu-west-1"
    bucket = "haddenindustries-com-static-assets"
    prefix = "ontology"
    exclude = "external/*.url"

    cmd = [
        sys.executable,
        str(upload_script),
        str(local_dir),
        "--region", region,
        "--bucket", bucket,
        "--prefix", prefix,
        "--exclude", exclude,
        "--wait-for-cloudfront"
    ]

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    print("SUCCESS: S3 upload completed successfully.")


if __name__ == "__main__":
    main()
