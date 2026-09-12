"""Exact module snapshots: bytes, identity and the parsed graph of one owned module."""
from __future__ import annotations

import hashlib
import logging
import subprocess
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path

import rdflib
from rdflib import Graph

from .modules import OwnedModule


class InputError(Exception):
    """An input cannot be read or parsed; exit status 2, never a policy result."""


# Ill-typed literals are policy results, not parse noise; keep rdflib quiet.
logging.getLogger("rdflib.term").setLevel(logging.CRITICAL)

_FORMATS = {".ttl": "turtle", ".owl": "xml", ".rdf": "xml", ".xml": "xml", ".nt": "nt"}


def detect_format(locator: str, raw: bytes) -> str:
    suffix = Path(locator.split(":", 1)[-1]).suffix.lower()
    if suffix in _FORMATS:
        return _FORMATS[suffix]
    head = raw.lstrip()[:200]
    return "xml" if head.startswith(b"<") else "turtle"


@dataclass(frozen=True)
class ModuleSource:
    """One module document with its exact identity."""

    module: OwnedModule
    locator: str
    raw: bytes
    graph: Graph = field(compare=False, hash=False, repr=False)

    @property
    def digest(self) -> str:
        return "sha256:" + hashlib.sha256(self.raw).hexdigest()


@contextmanager
def lexical_literals():
    """Parse with literal normalisation off and restore the caller's setting afterwards.

    pySHACL flips ``rdflib.NORMALIZE_LITERALS`` back to True after every
    validation, so the package-level default cannot be relied on at parse time.
    ``Z`` versus ``+00:00`` and date-only lexical forms are policy-relevant.
    """
    previous = rdflib.NORMALIZE_LITERALS
    rdflib.NORMALIZE_LITERALS = False
    try:
        yield
    finally:
        rdflib.NORMALIZE_LITERALS = previous


def parse_module_bytes(module: OwnedModule, locator: str, raw: bytes, rdf_format: str | None = None) -> ModuleSource:
    graph = Graph()
    try:
        with lexical_literals():
            graph.parse(data=raw, format=rdf_format or detect_format(locator, raw))
    except Exception as exc:  # rdflib raises a wide variety of parser exceptions
        raise InputError(f"{locator}: cannot parse as RDF ({type(exc).__name__}: {exc})") from exc
    return ModuleSource(module=module, locator=locator, raw=raw, graph=graph)


def read_module_source(module: OwnedModule, path: Path | str, *, revision: str | None = None,
                       repository: Path | None = None) -> ModuleSource:
    """Read exact bytes from the working tree, the index (``revision=""``) or a commit.

    ``revision`` follows ``git show`` syntax: ``""`` reads the staged blob and a
    commit-ish reads that commit's blob. The locator retains the identity used.
    """
    relative = str(path).replace("\\", "/")
    if revision is None:
        file_path = (repository / relative) if repository else Path(relative)
        if not file_path.is_file():
            raise InputError(f"{relative}: not a regular file")
        return parse_module_bytes(module, relative, file_path.read_bytes())
    spec = f"{revision}:{relative}"
    try:
        raw = subprocess.check_output(["git", "show", spec], cwd=repository, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.decode("utf-8", errors="replace").strip()
        raise InputError(f"git object {spec} is unavailable: {detail}") from exc
    return parse_module_bytes(module, spec, raw, detect_format(relative, raw))
