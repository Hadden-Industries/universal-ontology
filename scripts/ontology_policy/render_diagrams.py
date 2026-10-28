"""Validate explanatory diagram ownership and render all theme/format variants."""

from __future__ import annotations

import base64
import json
import shutil
import subprocess
from html import escape
from pathlib import Path

from defusedxml import ElementTree

from .documentation_model import DocumentationModel
from .namespaces import REPOSITORY_ROOT

DIAGRAM_IDS = frozenset(
    (
        "policy-journey",
        "entity-anatomy",
        "dataset-access-guide",
        "scope-validation",
        "label-correspondence",
        "modification-obligation",
        "dcat-profile-constraints",
    )
)
MANIFEST = REPOSITORY_ROOT / "docs/editing-policy/source/diagram-views.json"


def diagram_views(model: DocumentationModel) -> tuple[dict, ...]:
    """Require all seven complete views, exact owned paths and current rule links."""
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Diagram manifest must be an object")
    entries = manifest.get("diagrams")
    if (
        manifest.get("schemaVersion") != 1
        or not isinstance(entries, list)
        or not all(isinstance(entry, dict) for entry in entries)
        or not all(isinstance(entry.get("id"), str) for entry in entries)
        or len(entries) != len(DIAGRAM_IDS)
        or {entry.get("id") for entry in entries} != DIAGRAM_IDS
    ):
        raise ValueError(
            "Diagram manifest must declare exactly seven unique diagram families"
        )
    fingerprints = model.fingerprints()
    for entry in entries:
        identifier = entry["id"]
        expected_paths = {
            "source": f"docs/editing-policy/diagrams/{identifier}.mmd",
            "textEquivalent": f"docs/editing-policy/diagrams/{identifier}.md",
        }
        expected_paths.update(
            {
                theme
                + format.title(): f"docs/policy/assets/editing-policy/{identifier}-{theme}.{format}"
                for theme in ("light", "dark")
                for format in ("svg", "png")
            }
        )
        for key, path in expected_paths.items():
            if entry.get(key) != path:
                raise ValueError(
                    f"{identifier}: diagram path is outside its owned namespace"
                )
            source = REPOSITORY_ROOT / path
            if source.is_symlink() or source.is_junction():
                raise ValueError("Diagram paths cannot be links")
            if key in ("source", "textEquivalent") and (
                not source.is_file() or not source.read_text(encoding="utf-8").strip()
            ):
                raise ValueError(
                    f"{identifier}: missing diagram source or text equivalent"
                )
        refs = entry.get("requirementIds")
        if (
            not isinstance(refs, list)
            or not refs
            or any(ref not in fingerprints for ref in refs)
            or len(set(refs)) != len(refs)
        ):
            raise ValueError(f"{identifier}: unknown or duplicated policy reference")
        if entry.get("reviewedRuleFingerprints") != {
            ref: fingerprints[ref] for ref in refs
        }:
            raise ValueError(f"{identifier}: diagram review is stale")
        if (
            not isinstance(entry.get("alt"), str)
            or len(entry["alt"].strip()) < 20
            or entry["alt"] == identifier
        ):
            raise ValueError(f"{identifier}: meaningful diagram alt text is required")
    return tuple(entries)


def diagram_markdown(view: dict) -> list[str]:
    """Render theme-aware assets with visible takeaways and complete text equivalents."""
    paths = {
        key: value.removeprefix("docs/policy/")
        for key, value in view.items()
        if key in ("lightSvg", "darkSvg", "lightPng")
    }
    equivalent = (
        (REPOSITORY_ROOT / view["textEquivalent"]).read_text(encoding="utf-8").strip()
    )
    return [
        "<picture>",
        f'  <source media="(prefers-color-scheme: dark)" srcset="{escape(paths["darkSvg"], quote=True)}">',
        f'  <source media="(prefers-color-scheme: light)" srcset="{escape(paths["lightSvg"], quote=True)}">',
        f'  <img src="{escape(paths["lightPng"], quote=True)}" alt="{escape(view["alt"], quote=True)}">',
        "</picture>",
        "",
        view["alt"],
        "",
        "<details>",
        f"<summary>Text equivalent of the {view['id']} diagram</summary>",
        "",
        equivalent,
        "",
        "</details>",
        "",
        "Diagram requirements: "
        + " · ".join(f"[{ref}](#{ref.lower()})" for ref in view["requirementIds"]),
        "",
    ]


def render_diagram_assets(model: DocumentationModel) -> dict[str, bytes]:
    """Render locked native assets offline; fail when tools/browser are unavailable."""
    views = diagram_views(model)
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js is required for diagram generation")
    request = {
        "diagrams": [
            {
                "id": view["id"],
                "definition": (REPOSITORY_ROOT / view["source"]).read_text(
                    encoding="utf-8"
                ),
            }
            for view in views
        ]
    }
    result = subprocess.run(
        [node, str(REPOSITORY_ROOT / "scripts/renderEditingPolicyDiagrams.mjs")],
        input=json.dumps(request),
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=180,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Diagram rendering failed: " + result.stderr[-4096:])
    report = json.loads(result.stdout)
    expected = {
        Path(view[theme + format.title()]).name
        for view in views
        for theme in ("light", "dark")
        for format in ("svg", "png")
    }
    if (
        not isinstance(report, dict)
        or not isinstance(report.get("outputs"), dict)
        or set(report["outputs"]) != expected
    ):
        raise ValueError("Diagram renderer returned an incomplete output inventory")
    outputs = {
        "assets/editing-policy/" + name: base64.b64decode(raw, validate=True)
        for name, raw in sorted(report["outputs"].items())
    }
    for name, raw in outputs.items():
        if name.endswith(".png"):
            if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError(f"Invalid PNG diagram: {name}")
        else:
            document = ElementTree.fromstring(raw)
            for element in document.iter():
                tag = element.tag.rsplit("}", 1)[-1]
                if tag in ("script", "foreignObject", "image"):
                    raise ValueError(f"Active/external SVG content ({tag}): {name}")
                for key, value in element.attrib.items():
                    if key.rsplit("}", 1)[-1] in (
                        "href",
                        "src",
                    ) and not value.startswith(("#", "data:")):
                        raise ValueError(f"External SVG dependency: {name}")
                text = element.text or ""
                if (
                    "@import" in text
                    or "url(http" in text
                    or 'url("http' in text
                    or "url('http" in text
                ):
                    raise ValueError(f"External SVG stylesheet: {name}")
    toolchain = report.get("toolchain")
    if (
        not isinstance(toolchain, dict)
        or set(toolchain)
        != {"nodeVersion", "browserVersion", "mermaidCliVersion", "fontVersion"}
        or not all(isinstance(value, str) and value for value in toolchain.values())
    ):
        raise ValueError("Diagram renderer did not identify its actual toolchain")
    outputs["Editing-Policy.toolchain.json"] = (
        json.dumps(toolchain, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    return outputs
