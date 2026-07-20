#!/usr/bin/env python3
"""
Python runner to create full versions of ontologies by merging imports.
"""

import subprocess
import sys
from pathlib import Path


def main():
    script_dir = Path(__file__).resolve().parent
    merge_script = script_dir / "merge_owl_imports.py"

    if not merge_script.is_file():
        print(f"[ERROR] Helper script not found at '{merge_script}'", file=sys.stderr)
        sys.exit(1)

    # Resolve target version paths relative to the script location
    targets = [
        ("../dist/iso-iec/11179/-3/ed-4/20260714", "../dist/iso-iec/11179/-3/ed-4/20260714-full"),
        ("../dist/universal/reference-data/20260714", "../dist/universal/reference-data/20260714-full"),
        ("../dist/universal/core/20260714", "../dist/universal/core/20260714-full"),
        ("../dist/universal/extended/20260714", "../dist/universal/extended/20260714-full"),
    ]

    for src, dest in targets:
        src_path = (script_dir / src).resolve()
        dest_path = (script_dir / dest).resolve()

        print(f"Merging owl imports: {src} -> {dest}")
        cmd = [sys.executable, str(merge_script), str(src_path), str(dest_path)]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Failed merging {src} to {dest}", file=sys.stderr)
            sys.exit(e.returncode)

    print("SUCCESS: All full versions created.")


if __name__ == "__main__":
    main()
