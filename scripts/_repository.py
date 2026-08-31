#!/usr/bin/env python3
r"""
Locating and interrogating the Git working tree the setup scripts operate on.

Each setup script derives the repository root from its own location rather than
trusting the current working directory, so it behaves the same whether it is
invoked as `py <scripts>\set_up_agent_skills.py` from the root or by absolute
path from somewhere else entirely.

`<scripts>` throughout these modules means "the directory holding the setup
scripts, one level below the repository root". Its name is deliberately never
inspected: this repository calls it `scripts/`, another may call it `util/`, and
a script that insisted on a particular name would refuse to run in a repository
whose layout is equally valid.

The tracking queries exist because these scripts delete and rewrite generated
directories. Asking Git what it tracks, and what it ignores, before removing
anything is what keeps a mistaken path from destroying committed work.

Not an entry point. The leading underscore marks it internal, as PEP 8 asks of
modules that are not part of a public interface.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

from _commands import SetupError, require_command, run


def git_output(repo: Path, *args: str) -> str:
    result = run((require_command("git"), "-C", repo, *args), capture=True)

    return result.stdout.strip()


def derive_repo_from_script(script: Path) -> Path:
    """
    Derives the repository root from `<repo>/<scripts>/<script>`.

    Callers pass their own `__file__`. The only requirement is that the script
    sits exactly one level below the repository root; the name of the directory
    holding it is never examined, so `scripts/`, `util/`, `tools/` and anything
    else work identically.

    Git is the arbiter. Asking it for the working tree's top level and requiring
    that answer to equal the script's grandparent is what makes a misplaced
    script fail loudly instead of generating state in the wrong directory.
    """
    script_path = Path(script).resolve()
    candidate = script_path.parent.parent.resolve()

    try:
        discovered = Path(
            git_output(candidate, "rev-parse", "--show-toplevel")
        ).resolve()
    except subprocess.CalledProcessError as exc:
        raise SetupError(
            "The directory above this script's own directory is not a Git "
            f"working tree: {candidate}\n"
            f"Script: {script_path}"
        ) from exc

    if discovered != candidate:
        raise SetupError(
            "This setup script must live exactly one level below the "
            "repository root.\n"
            f"Script: {script_path}\n"
            f"Implies repository root: {candidate}\n"
            f"Git reports repository root: {discovered}"
        )

    return discovered


def normalize_remote(url: str) -> str:
    """Reduces any Git remote spelling to `host/owner/name` for comparison."""
    value = url.strip().lower().replace("\\", "/")
    value = re.sub(r"^git@github\.com:", "github.com/", value)
    value = re.sub(r"^ssh://git@github\.com/", "github.com/", value)
    value = re.sub(r"^https?://", "", value)
    value = re.sub(r"^git://", "", value)

    if value.endswith(".git"):
        value = value[:-4]

    return value.rstrip("/")


def verify_repo_identity(repo: Path, expected: str) -> None:
    """
    Requires one of the working tree's remotes to be `expected`.

    This guards the generated state: a setup script pointed at the wrong clone
    would delete and rewrite directories belonging to an unrelated project.
    """
    output = git_output(repo, "remote", "-v")
    remotes = {
        fields[1]
        for line in output.splitlines()
        if len(fields := line.split()) >= 2
    }
    normalized = {normalize_remote(url) for url in remotes}

    if expected not in normalized:
        listing = "\n".join(f"  - {url}" for url in sorted(remotes))
        raise SetupError(
            "Refusing to bootstrap because this working tree does not have a "
            f"remote for {expected}.\n"
            f"Repository root: {repo}\n"
            f"Remotes:\n{listing or '  (none)'}\n\n"
            "Use --allow-unverified-repo only for an intentional fork or "
            "worktree without the canonical remote."
        )


def tracked_paths_under(repo: Path, relative_path: str) -> list[str]:
    """Lists the paths Git tracks under `relative_path`, if any."""
    result = git_output(repo, "ls-files", "--", relative_path)

    return [line for line in result.splitlines() if line.strip()]


def is_ignored(repo: Path, relative_path: str) -> bool:
    """
    Reports whether Git would ignore `relative_path`.

    `--no-index` is required so the answer reflects the ignore rules alone,
    independently of whether the path currently exists or is tracked.
    """
    result = run(
        (
            require_command("git"),
            "-C",
            repo,
            "check-ignore",
            "--quiet",
            "--no-index",
            "--",
            relative_path,
        ),
        check=False,
    )

    return result.returncode == 0
