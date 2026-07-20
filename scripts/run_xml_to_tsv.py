#!/usr/bin/env python3
"""
Python runner to convert version XML files to TSV.
"""

import subprocess
import sys
from pathlib import Path


def main():
    script_dir = Path(__file__).resolve().parent
    converter_script = script_dir / "xml_to_tsv.py"

    if not converter_script.is_file():
        print(f"[ERROR] Helper script not found at '{converter_script}'", file=sys.stderr)
        sys.exit(1)

    # Resolve paths relative to the script location
    ref_data = (script_dir / "../dist/universal/reference-data/latest").resolve()
    core = (script_dir / "../dist/universal/core/latest").resolve()
    extended = (script_dir / "../dist/universal/extended/latest").resolve()
    output_tsv = (script_dir / "xml_to_tsv_output.tsv").resolve()

    print("Converting XML versions to TSV...")
    cmd = [
        sys.executable,
        str(converter_script),
        str(ref_data),
        str(core),
        str(extended),
        str(output_tsv)
    ]
    try:
        subprocess.run(cmd, check=True)
        print(f"SUCCESS: TSV successfully written to '{output_tsv}'")
    except subprocess.CalledProcessError as e:
        print("[ERROR] Conversion failed.", file=sys.stderr)
        sys.exit(e.returncode)


if __name__ == "__main__":
    main()
