"""Prepare a manifest-owned Wiki projection without taking deployment authority.

The release orchestrator must authenticate qualification and main-revision
identity before calling this module, then commit/push with ordinary Git compare
and swap semantics. Only the explicit base preflight performs read-only Git
inspection; the preparation operations perform no Git or network operation.
It refuses unrelated collisions, symlinks and changed previously managed files.
Preparation is replayable after an interrupted write using its bounded journal.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path, PurePosixPath

BEGIN = "<!-- BEGIN GENERATED EDITING POLICY NAVIGATION -->"
END = "<!-- END GENERATED EDITING POLICY NAVIGATION -->"
MANIFEST = ".editing-policy-publication-manifest.json"
JOURNAL = ".editing-policy-publication-pending.json"


def assert_wiki_base(wiki: Path, expected_revision: str) -> None:
    """Refuse changed local or remote Wiki bases before candidate preparation.

    The eventual authorised Git push must remain non-forcing; this read-only
    preflight cannot close the race between checking and pushing.
    """
    if not re.fullmatch(r"[a-f0-9]{40}", expected_revision):
        raise ValueError("An exact Wiki base revision is required")
    local = subprocess.run(
        ["git", "-C", str(wiki), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if local.returncode != 0 or local.stdout.strip() != expected_revision:
        raise ValueError("Local Wiki base changed")
    remote = subprocess.run(
        ["git", "-C", str(wiki), "ls-remote", "--exit-code", "origin", "HEAD"],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if remote.returncode != 0 or remote.stdout.split() != [expected_revision, "HEAD"]:
        raise ValueError("Remote Wiki base changed or could not be verified")


def prepare_verified_publication(
    wiki: Path,
    repository: Path,
    expected_manifest_sha256: str,
    *,
    initial_files: dict[str, str] | None = None,
    initial_decision: str | None = None,
) -> dict:
    """Prepare exact externally qualified bytes, never self-attested replacements.

    The separately authorised release controller supplies the manifest digest
    obtained from trusted successful qualification at the exact main revision.
    This function verifies every declared input/output before any Wiki write.
    """
    from .documentation_outputs import json_bytes

    repository = repository.absolute()
    bundle = repository / "docs/policy"
    manifest_path = bundle / "Editing-Policy.manifest.json"
    _regular_path(repository, manifest_path)
    raw = manifest_path.read_bytes()
    if (
        not re.fullmatch(r"[a-f0-9]{64}", expected_manifest_sha256)
        or _digest(raw) != expected_manifest_sha256
    ):
        raise ValueError("Publication manifest differs from the qualified candidate")
    manifest = json.loads(raw)
    if (
        not isinstance(manifest, dict)
        or manifest.get("schemaVersion") != 1
        or manifest.get("inputDigestAlgorithm") != "sha256"
        or not isinstance(manifest.get("inputs"), dict)
        or not isinstance(manifest.get("outputs"), dict)
    ):
        raise ValueError("Invalid qualified documentation manifest")
    if manifest.get("inputDigest") != "sha256:" + _digest(
        json_bytes(manifest["inputs"])
    ):
        raise ValueError("Qualified input inventory digest is inconsistent")

    def declared_path(root, relative):
        if (
            not isinstance(relative, str)
            or "\\" in relative
            or ":" in relative
            or str(PurePosixPath(relative)) != relative
            or PurePosixPath(relative).is_absolute()
            or ".." in PurePosixPath(relative).parts
        ):
            raise ValueError("Invalid path in qualified manifest")
        path = root.joinpath(*PurePosixPath(relative).parts)
        _regular_path(root, path)
        return path

    for relative, digest in manifest["inputs"].items():
        if (
            not isinstance(digest, str)
            or not re.fullmatch(r"[a-f0-9]{64}", digest)
            or _digest(declared_path(repository, relative).read_bytes()) != digest
        ):
            raise ValueError(f"Qualified source input changed: {relative}")
    admitted = {}
    for relative, identity in manifest["outputs"].items():
        if not isinstance(identity, dict) or set(identity) != {"sha256", "bytes"}:
            raise ValueError("Invalid qualified output identity")
        content = declared_path(bundle, relative).read_bytes()
        if _digest(content) != identity["sha256"] or len(content) != identity["bytes"]:
            raise ValueError(f"Qualified output changed: {relative}")
        admitted[relative] = content
    if (
        "Editing-Policy.generated.md" not in admitted
        or "Editing-Policy.sidebar.md" not in admitted
    ):
        raise ValueError("Qualified page or sidebar is missing")
    payload = {
        "Editing-Policy.md": admitted["Editing-Policy.generated.md"],
        **{
            path: content
            for path, content in admitted.items()
            if path.startswith("assets/editing-policy/")
        },
    }
    return prepare_publication(
        wiki,
        payload,
        admitted["Editing-Policy.sidebar.md"].decode("utf-8"),
        manifest["inputDigest"],
        initial_files=initial_files,
        initial_decision=initial_decision,
    )


def merge_sidebar(existing: str, generated: str) -> str:
    """Replace exactly one bounded fragment, preserving every other character."""
    block = BEGIN + "\n" + generated.rstrip("\n") + "\n" + END
    if BEGIN in generated or END in generated:
        raise ValueError("Generated navigation cannot contain ownership markers")
    if BEGIN not in existing and END not in existing:
        return (
            existing
            + ("\n" if existing and not existing.endswith("\n") else "")
            + block
            + "\n"
        )
    if (
        existing.count(BEGIN) != 1
        or existing.count(END) != 1
        or existing.index(END) < existing.index(BEGIN)
    ):
        raise ValueError("Sidebar ownership markers are ambiguous")
    start, end = existing.index(BEGIN), existing.index(END) + len(END)
    return existing[:start] + block + existing[end:]


def _managed_path(root: Path, relative: str) -> Path:
    """Admit only the declared page/asset namespace and regular local paths."""
    if (
        not isinstance(relative, str)
        or "\\" in relative
        or ":" in relative
        or "\0" in relative
    ):
        raise ValueError("Invalid managed path")
    parts = PurePosixPath(relative).parts
    if (
        PurePosixPath(relative).is_absolute()
        or any(part in (".", "..") for part in parts)
        or str(PurePosixPath(relative)) != relative
    ):
        raise ValueError("Managed path escapes the Wiki")
    if relative != "Editing-Policy.md" and not (
        len(parts) >= 3 and parts[:2] == ("assets", "editing-policy")
    ):
        raise ValueError("Path is outside publication ownership")
    target = root.joinpath(*parts)
    _regular_path(root, target)
    return target


def _regular_path(root: Path, target: Path) -> None:
    """Refuse symlinks/reparse points at every component, including control files."""
    current = target
    while True:
        if current.is_symlink() or current.is_junction():
            raise ValueError("Publication path traverses a link")
        if current == root:
            break
        if root not in current.parents:
            raise ValueError("Publication path is outside the Wiki")
        current = current.parent
    if target.exists() and not target.is_file():
        raise ValueError("Publication target is not a regular file")


def _digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _write(path: Path, raw: bytes) -> None:
    """Atomically replace a regular file within the admitted owned checkout."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".editing-policy.tmp")
    if temporary.exists() or temporary.is_symlink():
        raise ValueError("Unexpected publication temporary file")
    try:
        with temporary.open("xb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.is_file() and not temporary.is_symlink():
            temporary.unlink()


def prepare_publication(
    wiki: Path,
    outputs: dict[str, bytes],
    sidebar: str,
    input_digest: str,
    *,
    initial_files: dict[str, str] | None = None,
    initial_decision: str | None = None,
) -> dict:
    """Apply exact verified bytes to an exclusively owned disposable Wiki checkout.

    Caller supplies a trusted manifest's exact bytes and input digest. All paths,
    old identities and the bounded recovery journal are checked before mutation.
    Unrelated files and sidebar content are never admitted as owned payload.
    First-publication adoption requires an explicit decision and exact prior
    file digests; merely selecting a Wiki never grants that ownership.
    """
    wiki = wiki.absolute()
    if not wiki.is_dir() or wiki.is_symlink() or wiki.is_junction():
        raise ValueError("Wiki must be an owned regular directory")
    if "Editing-Policy.md" not in outputs or not all(
        isinstance(raw, bytes) for raw in outputs.values()
    ):
        raise ValueError("Publication requires exact page and asset bytes")
    if not isinstance(input_digest, str) or not re.fullmatch(
        r"sha256:[a-f0-9]{64}", input_digest
    ):
        raise ValueError("Publication requires a SHA-256 input identity")
    targets = {relative: _managed_path(wiki, relative) for relative in outputs}
    for name in (MANIFEST, JOURNAL, "_Sidebar.md"):
        _regular_path(wiki, wiki / name)
    prior = (
        json.loads((wiki / MANIFEST).read_bytes())
        if (wiki / MANIFEST).exists()
        else {"schemaVersion": 1, "files": {}}
    )
    if initial_files is not None:
        if (
            not isinstance(initial_files, dict)
            or not initial_files
            or not isinstance(initial_decision, str)
            or not initial_decision.strip()
        ):
            raise ValueError(
                "Initial Wiki adoption requires exact files and an explicit decision"
            )
        if (wiki / MANIFEST).exists():
            if (
                not isinstance(prior, dict)
                or prior.get("initialOwnershipDecision") != initial_decision
            ):
                raise ValueError("Initial adoption conflicts with existing ownership")
        else:
            prior = {
                "schemaVersion": 1,
                "files": initial_files,
                "initialOwnershipDecision": initial_decision,
            }
    elif initial_decision is not None:
        raise ValueError("Initial ownership decision has no exact file inventory")
    if (
        not isinstance(prior, dict)
        or prior.get("schemaVersion") != 1
        or not isinstance(prior.get("files"), dict)
        or not all(
            isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value)
            for value in prior["files"].values()
        )
    ):
        raise ValueError("Invalid prior publication manifest")
    previous = {relative: _managed_path(wiki, relative) for relative in prior["files"]}
    generated = {relative: _digest(raw) for relative, raw in outputs.items()}
    desired = {"schemaVersion": 1, "inputDigest": input_digest, "files": generated}
    if "initialOwnershipDecision" in prior:
        desired["initialOwnershipDecision"] = prior["initialOwnershipDecision"]
    journal = (
        json.loads((wiki / JOURNAL).read_bytes()) if (wiki / JOURNAL).exists() else None
    )
    if journal is not None and not isinstance(journal, dict):
        raise ValueError("Invalid pending publication journal")
    # The manifest is the final durable payload write. A crash before journal
    # removal can therefore leave the already-committed desired manifest.
    if journal is not None and prior == desired == journal.get("desired"):
        prior = journal["prior"]
        previous = {
            relative: _managed_path(wiki, relative) for relative in prior["files"]
        }
    if journal is not None and (
        journal.get("desired") != desired or journal.get("prior") != prior
    ):
        raise ValueError("Interrupted publication has different inputs")
    for relative, path in previous.items():
        observed = _digest(path.read_bytes()) if path.is_file() else None
        allowed = {prior["files"][relative]}
        if journal is not None:
            allowed.add(generated.get(relative))
        if observed not in allowed:
            raise ValueError(f"Previously managed file was modified: {relative}")
    for relative, path in targets.items():
        if relative not in previous and path.exists():
            if journal is None or _digest(path.read_bytes()) != generated[relative]:
                raise ValueError(f"Publication collides with unowned file: {relative}")
    existing_sidebar = (
        (wiki / "_Sidebar.md").read_bytes() if (wiki / "_Sidebar.md").exists() else b""
    )
    new_sidebar = merge_sidebar(existing_sidebar.decode("utf-8"), sidebar).encode(
        "utf-8"
    )
    if journal is not None and _digest(existing_sidebar) not in {
        journal["sidebarBefore"],
        journal["sidebarAfter"],
    }:
        raise ValueError("Sidebar changed during interrupted publication")
    if journal is None:
        _write(
            wiki / JOURNAL,
            (
                json.dumps(
                    {
                        "prior": prior,
                        "desired": desired,
                        "sidebarBefore": _digest(existing_sidebar),
                        "sidebarAfter": _digest(new_sidebar),
                    },
                    indent=2,
                )
                + "\n"
            ).encode("utf-8"),
        )
    for relative, raw in outputs.items():
        _write(targets[relative], raw)
    for relative, path in previous.items():
        if relative not in outputs and path.exists():
            path.unlink()
    _write(wiki / "_Sidebar.md", new_sidebar)
    _write(wiki / MANIFEST, (json.dumps(desired, indent=2) + "\n").encode("utf-8"))
    (wiki / JOURNAL).unlink()
    return desired
