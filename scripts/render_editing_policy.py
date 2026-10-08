#!/usr/bin/env python3
"""Generate the Editing Policy page from the canonical policy graph, or check that it is current.

Exit status: 0 generated/current; 1 the checked document is stale; 2 the policy
cannot be loaded or fails its own metadata contract.
"""

import argparse
import base64
import json
import shutil
import subprocess
import sys
import uuid
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
    # The package owns bounds, policy selection, analysis and result validation.
    # This caller owns only request correlation and graph-derived freshness.
    logical_path = GENERATED_DOCUMENT_PATH.relative_to(root).as_posix()
    request_id = str(uuid.uuid4())
    result = subprocess.run(
        [
            node,
            str(cli),
            "document",
            "--root",
            str(root),
            "--execution-profile",
            str(root / ".markdown-quality-execution.json"),
            "--json",
        ],
        input=json.dumps(
            {
                "path": logical_path,
                "requestId": request_id,
                "contentBase64": base64.b64encode(rendered.encode("utf-8")).decode(
                    "ascii"
                ),
            }
        ),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    report = json.loads(result.stdout)
    document = report.get("document") if isinstance(report, dict) else None
    if (
        result.returncode != 0
        or not isinstance(report, dict)
        or report.get("exitCode") != 0
        or report.get("operation") != "format"
        or report.get("written") != []
        or report.get("errors") != []
        or not isinstance(document, dict)
        or document.get("path") != logical_path
        or document.get("requestId") != request_id
        or not isinstance(document.get("contentBase64"), str)
    ):
        raise RuntimeError(
            "Generated policy failed canonical Markdown quality: "
            + result.stdout[:2048]
        )
    return base64.b64decode(document["contentBase64"], validate=True)


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
