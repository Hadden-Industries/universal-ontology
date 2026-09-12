"""Publication gate: only a qualified, unchanged active set may be uploaded.

The gate is consulted by scripts/upload_to_s3.py immediately before the
external uploader runs. It refuses a missing, non-qualifying or diagnostic
receipt; any active artifact whose bytes differ from the qualified digest; a
policy, authority or lock identity that changed since qualification; a module
set that is only partly covered; and a derived `dist/` copy that differs from
the exact source bytes. It never repairs anything.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from .authorities import AUTHORITIES_DIRECTORY, authority_identities
from .modules import load_owned_modules
from .namespaces import REPOSITORY_ROOT
from .policy import load_policy
from .reports import RECEIPT_FILENAME, REPORT_DIRECTORY, lock_identity


class PublicationRefusal(Exception):
    """The publication boundary refused the candidate; nothing is uploaded."""


@dataclass(frozen=True)
class GateVerdict:
    receipt_purpose: str
    bound_artifacts: tuple[str, ...]
    policy_identity: str


def _digest(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def check_publication_gate(
    *, repository: Path, report_directory: Path, active_artifacts: dict, policy_identity: str,
    authority_identities: tuple, lock_identity: str, dist_directory: Path,
) -> GateVerdict:
    receipt_path = report_directory / RECEIPT_FILENAME
    if not receipt_path.is_file():
        raise PublicationRefusal(f"No qualification receipt at {receipt_path}; run the latest-active or candidate qualification first.")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    if not receipt.get("qualifies"):
        raise PublicationRefusal("The receipt does not qualify activation.")
    if receipt.get("purpose") not in ("latest-active", "candidate"):
        raise PublicationRefusal(f"The receipt purpose {receipt.get('purpose')!r} is diagnostic; a qualification purpose is required.")
    if receipt.get("policyIdentity") != policy_identity:
        raise PublicationRefusal("The policy changed since qualification; re-qualify before publishing.")
    recorded_authorities = {(a["name"], a["digest"]) for a in receipt.get("authorities", [])}
    if recorded_authorities != set(authority_identities):
        raise PublicationRefusal("The authority snapshots changed since qualification; re-qualify before publishing.")
    if receipt.get("lockIdentity") != lock_identity:
        raise PublicationRefusal("The dependency lock changed since qualification; re-qualify before publishing.")
    qualified = {m["module"]: m for m in receipt.get("modules", [])}
    bound = []
    for module_iri, artifact in sorted(active_artifacts.items()):
        entry = qualified.get(module_iri)
        if entry is None:
            raise PublicationRefusal(f"Module {module_iri} is not covered by the receipt; the module set is only partly prepared.")
        if entry["locator"] != artifact:
            raise PublicationRefusal(f"Module {module_iri} was qualified as {entry['locator']} but the active artifact is {artifact}.")
        source = repository / artifact
        if not source.is_file():
            raise PublicationRefusal(f"Active artifact {artifact} is missing.")
        current = _digest(source)
        if current != entry["digest"]:
            raise PublicationRefusal(f"{artifact} differs from the qualified bytes ({entry['digest']} recorded, {current} now).")
        derived = dist_directory / artifact.split("/", 1)[1] if artifact.startswith("src/") else dist_directory / artifact
        if not derived.is_file() or derived.read_bytes() != source.read_bytes():
            raise PublicationRefusal(f"The derived output {derived} does not match the qualified source bytes of {artifact}; rebuild before publishing.")
        bound.append(artifact)
    return GateVerdict(receipt["purpose"], tuple(bound), policy_identity)


def check_repository_publication(repository: Path = REPOSITORY_ROOT, report_directory: Path = REPORT_DIRECTORY,
                                 authorities_directory: Path = AUTHORITIES_DIRECTORY) -> GateVerdict:
    """Gate the real repository: recorded active artifacts, current policy, authorities and lock."""
    policy = load_policy()
    from .validation import required_authorities

    required = required_authorities(policy)
    active = {str(m.iri): m.active_artifact_path for m in load_owned_modules() if m.active_artifact_path}
    return check_publication_gate(
        repository=repository, report_directory=report_directory, active_artifacts=active,
        policy_identity=policy.identity,
        authority_identities=authority_identities(authorities_directory, required) if required else (),
        lock_identity=lock_identity(repository), dist_directory=repository / "dist",
    )
