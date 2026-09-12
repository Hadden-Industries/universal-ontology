#!/usr/bin/env python3
"""Generate the Editing Policy page from the canonical policy graph, or check that it is current.

Exit status: 0 generated/current; 1 the checked document is stale; 2 the policy
cannot be loaded or fails its own metadata contract.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.modules import PolicyDefinitionError  # noqa: E402
from ontology_policy.namespaces import POLICY_DIRECTORY  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.rendering import GENERATED_DOCUMENT_PATH, render_editing_policy  # noqa: E402


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Render or check the generated Editing Policy.")
    parser.add_argument("--check", action="store_true", help="Compare the rendered bytes with the document; write nothing")
    parser.add_argument("--output", type=Path, default=GENERATED_DOCUMENT_PATH, help="Generated document path")
    parser.add_argument("--policy-directory", type=Path, default=POLICY_DIRECTORY, help="Directory holding the policy .ttl files")
    args = parser.parse_args(argv)
    try:
        rendered = render_editing_policy(load_policy(args.policy_directory)).encode("utf-8")
    except PolicyDefinitionError as error:
        print(f"POLICY_DEFINITION_ERROR: {error}", file=sys.stderr)
        return 2
    if args.check:
        current = args.output.read_bytes() if args.output.is_file() else None
        if current == rendered:
            print(f"{args.output} is current.")
            return 0
        print(f"{args.output} is stale or missing; regenerate it from the policy sources.", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(rendered)
    print(f"Wrote {args.output} ({len(rendered)} bytes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
