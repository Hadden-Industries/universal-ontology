"""Assemble deterministic documentation bytes and their publication manifest."""

from __future__ import annotations

import dataclasses
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from .check_documentation import preservation_report
from .documentation_extract import extract_documentation
from .namespaces import (
    CONTEXT_SHAPES_FILENAME,
    POLICY_METADATA_SHAPES_FILENAME,
    REPOSITORY_ROOT,
    RULE_FILENAMES,
)
from .policy import Policy
from .render_diagrams import render_diagram_assets

SIDEBAR = "[Editing Policy](Editing-Policy)\n\n- [Contributor guide](Editing-Policy#contributor-guide)\n- [Technical reference](Editing-Policy#technical-reference)\n"


def json_bytes(value) -> bytes:
    """Use the repository's two-space producer JSON contract and final LF."""
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def input_inventory(policy: Policy) -> dict[str, str]:
    """Hash source/tool declarations in stable logical paths, never output state."""
    files = {
        "policy/" + filename: policy.directory / filename
        for filename in (
            *RULE_FILENAMES,
            CONTEXT_SHAPES_FILENAME,
            POLICY_METADATA_SHAPES_FILENAME,
        )
    }
    for relative in ("docs/editing-policy", "scripts/ontology_policy"):
        for path in sorted((REPOSITORY_ROOT / relative).rglob("*")):
            if (
                path.is_file()
                and "__pycache__" not in path.parts
                and path.suffix != ".pyc"
            ):
                files[path.relative_to(REPOSITORY_ROOT).as_posix()] = path
    for relative in (
        "scripts/render_editing_policy.py",
        ".markdown-quality.json",
        ".markdown-quality-execution.json",
        "tooling/markdown/package-lock.json",
        "requirements.lock.txt",
        "package-lock.json",
        "scripts/renderEditingPolicyDiagrams.mjs",
        "scripts/editingPolicyGfm.js",
        "scripts/verifyEditingPolicyAccessibility.mjs",
        ".json-quality.json",
    ):
        files[relative] = REPOSITORY_ROOT / relative
    return {
        relative: hashlib.sha256(path.read_bytes()).hexdigest()
        for relative, path in sorted(files.items())
    }


def documentation_outputs(
    policy: Policy, markdown: bytes, *, include_assets: bool = True
) -> dict[str, bytes]:
    """Validate preservation before publishing a complete deterministic output set."""
    model = extract_documentation(policy)
    report = preservation_report(policy, model, markdown.decode("utf-8"))
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js is required for GFM admission")
    gfm = subprocess.run(
        [node, str(REPOSITORY_ROOT / "scripts/editingPolicyGfm.js"), "--check-stdin"],
        input=markdown,
        capture_output=True,
        timeout=30,
        check=False,
    )
    if gfm.returncode != 0 or json.loads(gfm.stdout) != {"gfmValid": True}:
        raise ValueError(
            "Generated policy GFM admission failed: "
            + gfm.stderr.decode("utf-8", errors="replace")[-2048:]
        )
    inputs = input_inventory(policy)
    digest = "sha256:" + hashlib.sha256(json_bytes(inputs)).hexdigest()
    model_value = {
        "schemaVersion": 1,
        "policyIdentity": model.policy_identity,
        "rules": [dataclasses.asdict(rule) for rule in model.rules],
        "canonicalGraph": json.loads(model.policy_graph_json),
        "sharedContext": json.loads(model.shared_context_json),
    }
    for rule in model_value["rules"]:
        rule["technical"] = json.loads(rule.pop("characteristics_json"))
    outputs = {
        "Editing-Policy.generated.md": markdown,
        "Editing-Policy.sidebar.md": SIDEBAR.encode("utf-8"),
        "Editing-Policy.preservation.json": json_bytes(report),
        "Editing-Policy.model.json": json_bytes(model_value),
    }
    if include_assets:
        outputs.update(render_diagram_assets(model))
        outputs["assets/editing-policy/OpenSans-LICENSE.txt"] = (
            REPOSITORY_ROOT / "docs/editing-policy/source/fonts/LICENSE.txt"
        ).read_bytes()
    manifest = {
        "schemaVersion": 1,
        "generator": "scripts/render_editing_policy.py",
        "policyIdentity": policy.identity,
        "inputDigestAlgorithm": "sha256",
        "inputDigest": digest,
        "inputs": inputs,
        "outputs": {
            relative: {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
            for relative, raw in sorted(outputs.items())
        },
        "ruleFingerprints": model.fingerprints(),
    }
    outputs["Editing-Policy.manifest.json"] = json_bytes(manifest)
    return outputs


def compare_outputs(directory: Path, outputs: dict[str, bytes]) -> list[str]:
    """Return missing/stale declared outputs without writing or repairing them."""
    stale = [
        relative
        for relative, raw in sorted(outputs.items())
        if (directory / relative).is_symlink()
        or (directory / relative).is_junction()
        or not (directory / relative).is_file()
        or (directory / relative).read_bytes() != raw
    ]
    asset_root = directory / "assets/editing-policy"
    if asset_root.exists():
        stale.extend(
            path.relative_to(directory).as_posix()
            for path in sorted(asset_root.rglob("*"))
            if (path.is_file() or path.is_symlink())
            and path.relative_to(directory).as_posix() not in outputs
        )
    return sorted(set(stale))
