#!/usr/bin/env python3
"""
Running external commands for the repository setup scripts.

Every setup script shells out to `git`, `npx`, `npm`, `node`, or a Python it
installed itself, and each one wants the same two things: a command echoed
before it runs, so a failed bootstrap can be reproduced by hand from the log,
and a clear failure when a required tool is absent from PATH.

`SetupError` lives here rather than in a module of its own because this is the
leaf of the setup scripts' dependency graph — it imports nothing from its
siblings, so every other module can raise the same error type without a cycle.

Not an entry point. The leading underscore marks it internal, as PEP 8 asks of
modules that are not part of a public interface.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable


class SetupError(RuntimeError):
    """Raised for a safe, user-actionable setup failure."""


def write_console_diagnostic(text: str, *, stream=None) -> str:
    """Flush readable diagnostics without losing glyphs to inherited error modes.

    This adapts presentation only. Protocol decoding and retained evidence must
    never use this escaping policy. Actual write/flush failures propagate.
    """
    destination = sys.stdout if stream is None else stream
    encoding = getattr(destination, 'encoding', None)
    displayed = text.encode(encoding, errors='backslashreplace').decode(encoding) if encoding else text
    destination.write(displayed)
    destination.flush()
    return 'written' if displayed == text else 'escaped'


def run(
    args: Iterable[object],
    *,
    cwd: Path | None = None,
    capture: bool = False,
    check: bool = True,
    env: dict[str, str] | None = None,
    encoding: str | None = None,
    errors: str | None = None,
) -> subprocess.CompletedProcess[str]:
    """
    Runs a command, echoing it first so the log doubles as a transcript.

    The echo is deliberate: when a bootstrap fails on someone else's machine,
    the printed command is the thing they can paste into a shell to reproduce
    the failure without reading this script.
    """
    command = [str(arg) for arg in args]
    write_console_diagnostic(f"> {subprocess.list2cmdline(command)}\n")

    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=check,
        text=True,
        capture_output=capture,
        env=env,
        encoding=encoding,
        errors=errors,
    )


def require_command(name: str) -> str:
    """Resolves a required executable on PATH, or fails with its name."""
    path = shutil.which(name)

    if not path:
        raise SetupError(f"Required command not found on PATH: {name}")

    return path
