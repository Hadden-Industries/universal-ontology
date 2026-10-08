#!/usr/bin/env python3
"""Generate the Editing Policy page from the canonical policy graph, or check that it is current.

Exit status: 0 generated/current; 1 the checked document is stale; 2 the policy
cannot be loaded or fails its own metadata contract.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.modules import PolicyDefinitionError  # noqa: E402
from ontology_policy.namespaces import POLICY_DIRECTORY  # noqa: E402
from ontology_policy.policy import load_policy  # noqa: E402
from ontology_policy.rendering import (  # noqa: E402
    GENERATED_DOCUMENT_PATH,
    render_editing_policy,
)


def format_generated_document(rendered: str) -> bytes:
    """Apply the canonical output path's Markdown policy before freshness comparison."""
    root = Path(__file__).resolve().parent.parent
    package_root = (
        root / "tooling/markdown/node_modules/@hadden-industries/markdown-quality"
    )
    metadata_path = package_root / "package.json"
    node = shutil.which("node")
    if node is None or not metadata_path.is_file():
        raise RuntimeError(
            "Run npm run install:markdown before policy generation/checking"
        )
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    bins = metadata.get("bin") if isinstance(metadata, dict) else None
    bin_path = bins.get("markdown-quality") if isinstance(bins, dict) else None
    if (
        not isinstance(metadata, dict)
        or metadata.get("name") != "@hadden-industries/markdown-quality"
        or not isinstance(bin_path, str)
    ):
        raise RuntimeError("Installed Markdown package has no supported public bin")
    cli = (package_root / bin_path).resolve()
    if not cli.is_relative_to(package_root.resolve()) or not cli.is_file():
        raise RuntimeError(
            "Installed Markdown public bin is missing or outside its package"
        )
    with tempfile.TemporaryDirectory(prefix="uo-generated-markdown-") as temporary:
        scratch = Path(temporary)
        shutil.copyfile(
            root / ".markdown-quality.json", scratch / ".markdown-quality.json"
        )
        # Selection must see the real logical path, including configured exclusions.
        output = scratch / GENERATED_DOCUMENT_PATH.relative_to(root)
        output.parent.mkdir(parents=True)
        output.write_bytes(rendered.encode("utf-8"))
        result = subprocess.run(
            [
                node,
                "--max-old-space-size=256",
                str(cli),
                "format",
                "--root",
                str(scratch),
                "--json",
            ],
            env={
                name: os.environ[name]
                for name in ("SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP")
                if name in os.environ
            },
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
            check=False,
        )
        report = json.loads(result.stdout)
        if (
            result.returncode != 0
            or not isinstance(report, dict)
            or report.get("exitCode") != 0
        ):
            raise RuntimeError(
                "Generated policy failed canonical Markdown quality: "
                + result.stdout[:2048]
            )
        return output.read_bytes()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Render or check the generated Editing Policy."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Compare the rendered bytes with the document; write nothing",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=GENERATED_DOCUMENT_PATH,
        help="Generated document path",
    )
    parser.add_argument(
        "--policy-directory",
        type=Path,
        default=POLICY_DIRECTORY,
        help="Directory holding the policy .ttl files",
    )
    args = parser.parse_args(argv)
    try:
        rendered = format_generated_document(
            render_editing_policy(load_policy(args.policy_directory))
        )
    except (
        PolicyDefinitionError,
        RuntimeError,
        OSError,
        ValueError,
        subprocess.TimeoutExpired,
    ) as error:
        print(f"POLICY_DEFINITION_ERROR: {error}", file=sys.stderr)
        return 2
    if args.check:
        current = args.output.read_bytes() if args.output.is_file() else None
        if current == rendered:
            print(f"{args.output} is current.")
            return 0
        print(
            f"{args.output} is stale or missing; regenerate it from the policy sources.",
            file=sys.stderr,
        )
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(rendered)
    print(f"Wrote {args.output} ({len(rendered)} bytes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
