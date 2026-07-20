#!/usr/bin/env python3
"""
Python runner to execute XSLT transformations on ontology files.
"""

import subprocess
import sys
from pathlib import Path


def main():
    script_dir = Path(__file__).resolve().parent
    transformer_script = script_dir / "xslt_transformer.py"

    if not transformer_script.is_file():
        print(f"[ERROR] Helper script not found at '{transformer_script}'", file=sys.stderr)
        sys.exit(1)

    # Forward any custom arguments; fall back to defaults if none are passed
    if len(sys.argv) > 1:
        args = sys.argv[1:]
    else:
        xml_input = (script_dir / "../iso-31073/iso-31073.owl").resolve()
        xsl_stylesheet = (script_dir / "dcterms_description_to_skos_definition.xsl").resolve()
        args = [str(xml_input), str(xsl_stylesheet)]

    print(f"Running XSLT transformer with arguments: {args}")
    cmd = [sys.executable, str(transformer_script)] + args
    try:
        subprocess.run(cmd, check=True)
        print("SUCCESS: XSLT transformation complete.")
    except subprocess.CalledProcessError as e:
        print("[ERROR] Transformation failed.", file=sys.stderr)
        sys.exit(e.returncode)


if __name__ == "__main__":
    main()
