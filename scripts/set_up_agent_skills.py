#!/usr/bin/env python3
r"""
Synchronize repo-local Agent Skills from the standard npx-skills project lock.

Expected repository layout:

    <repo>/
    ├── skills-lock.json
    └── <scripts>/
        └── set_up_agent_skills.py

Commit both files. Generated activation directories should be Git-ignored:

    .agents/skills/
    .claude/skills/

The script introduces no custom manifest or schema. `skills-lock.json` v1 is
the existing project lock format written by the `skills` CLI.

Default targets: codex, antigravity, claude-code.

Rerunning this script is the update operation. It explicitly re-adds each
declared skill from its recorded source using `skills@latest`. Skills sharing
a source are re-added in a single invocation, because `skills add` clones the
whole source repository once per call.

For upstream suites that reference a sibling `../_shared/`, the script detects
that dependency, vendors the source `_shared` directory into the generated
skill at `references/_shared/`, and rewrites the generated references. This
makes selected bundle modules self-contained and avoids `_shared` collisions.

That vendoring step reads upstream through a shallow, blobless, cone-mode
sparse checkout restricted to the `_shared` directories actually needed, so a
large suite repository is never materialized in full. Requires Git 2.25+.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit


LOCK_FILENAME = "skills-lock.json"
SUPPORTED_LOCK_VERSION = 1

DEFAULT_AGENTS = ("codex", "antigravity", "claude-code")

AGENT_SKILL_ROOTS = {
    "codex": Path(".agents") / "skills",
    "antigravity": Path(".agents") / "skills",
    "claude-code": Path(".claude") / "skills",
}

SHARED_REFERENCE = "../_shared"
VENDORED_SHARED_REFERENCE = "references/_shared"


class SetupError(RuntimeError):
    """A safe, actionable setup failure."""


def run(
    args: Iterable[object],
    *,
    cwd: Path | None = None,
    capture: bool = False,
    check: bool = True,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    command = [str(arg) for arg in args]
    print(f"> {subprocess.list2cmdline(command)}")
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        text=True,
        capture_output=capture,
        check=check,
        env=env,
    )


def lf_git_environment() -> dict[str, str]:
    """
    Return a child-process environment that forces Git checkouts to retain LF.

    npx-skills currently hashes the checked-out skill contents in its project
    lock. Inheriting a user's Windows core.autocrlf=true can therefore produce
    a different computedHash from an otherwise identical Unix checkout.

    Git's GIT_CONFIG_COUNT/KEY/VALUE mechanism scopes the override to this
    process tree and does not mutate user, system, or repository Git config.
    """
    env = os.environ.copy()

    try:
        count = int(env.get("GIT_CONFIG_COUNT", "0"))
    except ValueError as exc:
        raise SetupError(
            "Existing GIT_CONFIG_COUNT is not an integer; cannot safely append "
            "the process-local core.autocrlf override."
        ) from exc

    env[f"GIT_CONFIG_KEY_{count}"] = "core.autocrlf"
    env[f"GIT_CONFIG_VALUE_{count}"] = "false"
    env["GIT_CONFIG_COUNT"] = str(count + 1)

    return env


def require_command(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise SetupError(f"Required command not found on PATH: {name}")
    return path


def require_python_version() -> None:
    if sys.version_info < (3, 10):
        raise SetupError(
            "Python 3.10 or newer is required. "
            f"Running: {sys.version.split()[0]}"
        )


def git_output(repo: Path, *args: str) -> str:
    result = run(
        (require_command("git"), "-C", repo, *args),
        capture=True,
    )
    return result.stdout.strip()


def derive_repo_from_script() -> Path:
    """Derive <repo> from <repo>/<scripts>/set_up_agent_skills.py."""
    script_path = Path(__file__).resolve()

    expected_repo = script_path.parent.parent.resolve()

    try:
        actual_repo = Path(
            git_output(expected_repo, "rev-parse", "--show-toplevel")
        ).resolve()
    except subprocess.CalledProcessError as exc:
        raise SetupError(
            f"The directory above `<scripts>/` is not a Git repository: "
            f"{expected_repo}"
        ) from exc

    if actual_repo != expected_repo:
        raise SetupError(
            "The directory above `<scripts>/` is not exactly the Git repository "
            "root.\n"
            f"From script location: {expected_repo}\n"
            f"Git repository root: {actual_repo}"
        )

    return actual_repo


def load_lock(repo: Path) -> tuple[Path, dict[str, Any], bytes]:
    lock_path = repo / LOCK_FILENAME

    if not lock_path.is_file():
        raise SetupError(
            f"Missing {LOCK_FILENAME} at repository root: {lock_path}\n"
            "Create it by adding desired project skills with "
            "`npx skills@latest add ...`, then commit it."
        )

    raw = lock_path.read_bytes()

    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SetupError(f"{LOCK_FILENAME} is not valid UTF-8 JSON.") from exc

    if not isinstance(data, dict):
        raise SetupError(f"{LOCK_FILENAME} must contain a JSON object.")

    version = data.get("version")
    if version != SUPPORTED_LOCK_VERSION:
        raise SetupError(
            f"Unsupported {LOCK_FILENAME} version: {version!r}. "
            f"This script supports version {SUPPORTED_LOCK_VERSION}. "
            "Update the reusable script after reviewing the upstream format "
            "rather than guessing at a migration."
        )

    skills = data.get("skills")
    if not isinstance(skills, dict):
        raise SetupError(
            f"{LOCK_FILENAME} v{SUPPORTED_LOCK_VERSION} requires a `skills` "
            "object."
        )
    if not skills:
        raise SetupError(f"{LOCK_FILENAME} contains no project skills.")

    for skill_name, entry in skills.items():
        validate_lock_entry(skill_name, entry)

    return lock_path, data, raw


def validate_lock_entry(skill_name: object, entry: object) -> None:
    if not isinstance(skill_name, str) or not skill_name.strip():
        raise SetupError("Every skills-lock.json skill key must be non-empty.")

    if not isinstance(entry, dict):
        raise SetupError(
            f"Lock entry for {skill_name!r} must be a JSON object."
        )

    for field in ("source", "sourceType", "computedHash"):
        value = entry.get(field)
        if not isinstance(value, str) or not value:
            raise SetupError(
                f"Lock entry {skill_name!r} requires non-empty string "
                f"`{field}`."
            )

    for field in ("sourceUrl", "ref", "skillPath", "wellKnownDigest"):
        value = entry.get(field)
        if value is not None and not isinstance(value, str):
            raise SetupError(
                f"Lock entry {skill_name!r} field `{field}` must be a string "
                "when present."
            )

    subagents = entry.get("subagents")
    if subagents is not None and (
        not isinstance(subagents, list)
        or not all(isinstance(item, str) for item in subagents)
    ):
        raise SetupError(
            f"Lock entry {skill_name!r} field `subagents` must be an array "
            "of strings when present."
        )


def selected_roots(repo: Path, agents: tuple[str, ...]) -> tuple[Path, ...]:
    roots: list[Path] = []

    for agent in agents:
        root = (repo / AGENT_SKILL_ROOTS[agent]).resolve(strict=False)
        if root not in roots:
            roots.append(root)

    return tuple(roots)


def ensure_generated_roots_are_safe(
    repo: Path,
    roots: tuple[Path, ...],
) -> None:
    """
    Require generated roots to be untracked and ignored before rebuilding them.
    """
    for root in roots:
        relative = root.relative_to(repo).as_posix()

        tracked = git_output(repo, "ls-files", "--", relative)
        if tracked:
            rendered = "\n".join(
                f"  - {line}" for line in tracked.splitlines() if line
            )
            raise SetupError(
                f"Refusing to manage {relative}: Git tracks files underneath "
                f"it:\n{rendered}\n"
                "These activation directories must contain generated files "
                "only."
            )

        probe = f"{relative}/.set_up_agent_skills_ignore_probe"
        result = run(
            (
                require_command("git"),
                "-C",
                repo,
                "check-ignore",
                "--quiet",
                "--no-index",
                "--",
                probe,
            ),
            check=False,
        )

        if result.returncode != 0:
            suggested = (
                ".agents/skills/"
                if relative == ".agents/skills"
                else ".claude/skills/"
            )
            raise SetupError(
                f"Generated skill root `{relative}/` is not ignored by Git.\n"
                "Add this rule to the repository's committed .gitignore:\n\n"
                f"    {suggested}\n\n"
                "Then rerun this script."
            )


def remove_generated_root(repo: Path, root: Path) -> None:
    root = root.resolve(strict=False)

    try:
        root.relative_to(repo)
    except ValueError as exc:
        raise SetupError(
            f"Refusing to remove path outside repository: {root}"
        ) from exc

    if root.is_symlink():
        root.unlink()
        return

    is_junction = getattr(root, "is_junction", None)
    if is_junction and is_junction():
        os.rmdir(root)
        return

    if root.exists():
        shutil.rmtree(root)


def reset_generated_roots(repo: Path, roots: tuple[Path, ...]) -> None:
    print("\n== Reset generated Agent Skill activation roots ==")

    for root in roots:
        print(f"Resetting {root.relative_to(repo)}")
        remove_generated_root(repo, root)


def is_bare_shorthand(source: str) -> bool:
    return (
        ":" not in source
        and not source.startswith(".")
        and not source.startswith("/")
    )


def get_install_source(entry: dict[str, Any]) -> str:
    """
    Reconstruct a safe source argument from the standard lock entry.

    The explicit --skill filter keeps updates name-scoped, so skillPath does
    not need to be appended here.
    """
    source_type = entry["sourceType"]
    source_url = entry.get("sourceUrl")
    source = entry["source"]

    if source_url:
        install_source = source_url
    else:
        if source_type in {"git", "gitlab"} and is_bare_shorthand(source):
            raise SetupError(
                "Cannot safely reconstruct generic Git/GitLab source "
                f"{source!r}: the lock entry has no sourceUrl."
            )
        install_source = source

    ref = entry.get("ref")
    if ref and "#" not in install_source:
        install_source = f"{install_source}#{ref}"

    return install_source


def group_skills_by_install_source(
    skills: dict[str, dict[str, Any]],
) -> dict[str, tuple[str, ...]]:
    """
    Group declared skills by the exact `skills add` source they install from.

    `skills add` clones the entire source repository once per invocation, and
    exposes no depth or sparse control, so the only way to avoid re-cloning a
    repository is to install everything it provides in one invocation.

    Grouping on the reconstructed source string rather than on `source` alone
    keeps entries that pin different refs in separate groups, because they
    genuinely need separate checkouts.
    """
    grouped: dict[str, list[str]] = {}

    for skill_name in sorted(skills):
        source = get_install_source(skills[skill_name])
        grouped.setdefault(source, []).append(skill_name)

    return {source: tuple(names) for source, names in grouped.items()}


def sync_source(
    repo: Path,
    npx: str,
    source: str,
    skill_names: tuple[str, ...],
    agents: tuple[str, ...],
) -> None:
    command: list[str] = [
        npx,
        "--yes",
        "skills@latest",
        "add",
        source,
    ]

    for skill_name in skill_names:
        command.extend(("--skill", skill_name))

    for agent in agents:
        command.extend(("--agent", agent))

    # This --yes belongs to the skills CLI; the earlier one belongs to npx.
    command.append("--yes")

    run(
        command,
        cwd=repo,
        env=lf_git_environment(),
    )


def verify_skill_present(
    repo: Path,
    skill_name: str,
    agents: tuple[str, ...],
) -> None:
    missing: list[Path] = []

    for root in selected_roots(repo, agents):
        skill_md = root / skill_name / "SKILL.md"
        if not skill_md.is_file():
            missing.append(skill_md)

    if missing:
        rendered = "\n".join(f"  - {path}" for path in missing)
        raise SetupError(
            f"`npx skills` did not materialize {skill_name!r} in all expected "
            f"roots:\n{rendered}"
        )


def iter_regular_files(root: Path) -> Iterable[Path]:
    if not root.exists():
        return

    for path in root.rglob("*"):
        if path.is_file() and not path.is_symlink():
            yield path


def contains_shared_reference(skill_dir: Path) -> bool:
    needle = SHARED_REFERENCE.encode("utf-8")

    for path in iter_regular_files(skill_dir):
        try:
            if needle in path.read_bytes():
                return True
        except OSError as exc:
            raise SetupError(
                f"Could not inspect installed file: {path}"
            ) from exc

    return False


def unique_installed_skill_dirs(
    repo: Path,
    skill_name: str,
    agents: tuple[str, ...],
) -> tuple[Path, ...]:
    directories: list[Path] = []

    for root in selected_roots(repo, agents):
        lexical = root / skill_name
        if not lexical.exists():
            continue

        resolved = lexical.resolve()

        try:
            resolved.relative_to(repo)
        except ValueError as exc:
            raise SetupError(
                f"Refusing to modify installed skill {skill_name!r}: its "
                f"resolved path escapes the repository:\n  {resolved}"
            ) from exc

        if resolved not in directories:
            directories.append(resolved)

    return tuple(directories)


def clone_url_for_entry(
    entry: dict[str, Any],
    repo: Path,
) -> tuple[str, Path | None]:
    """
    Return (clone URL, local source path). Only one is populated.
    """
    source_type = entry["sourceType"]
    source = entry["source"]
    source_url = entry.get("sourceUrl")

    if source_type == "local":
        local = Path(source)
        if not local.is_absolute():
            local = (repo / local).resolve()
        else:
            local = local.resolve()

        if not local.is_dir():
            raise SetupError(f"Local skill source does not exist: {local}")
        return "", local

    if source_type == "github" and is_bare_shorthand(source):
        return (
            f"https://github.com/{source.removesuffix('.git')}.git",
            None,
        )

    candidate = source_url or source

    if candidate.startswith(("git@", "ssh://")):
        return candidate.split("#", 1)[0], None

    if candidate.startswith(("http://", "https://")):
        parts = urlsplit(candidate)
        host = parts.hostname or ""
        path_parts = [part for part in parts.path.split("/") if part]

        if host == "github.com" and len(path_parts) >= 2:
            owner = path_parts[0]
            repo_name = path_parts[1].removesuffix(".git")
            return f"https://github.com/{owner}/{repo_name}.git", None

        if host == "gitlab.com" and ".git" in parts.path:
            clean_path = parts.path.split(".git", 1)[0] + ".git"
            return (
                urlunsplit(
                    (parts.scheme, parts.netloc, clean_path, "", "")
                ),
                None,
            )

        clean = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, parts.query, "")
        )
        return clean, None

    if candidate.endswith(".git"):
        return candidate, None

    raise SetupError(
        "Cannot obtain sibling `_shared` resources from a safe Git checkout "
        f"for source {candidate!r}."
    )


def source_cache_key(entry: dict[str, Any], repo: Path) -> str:
    clone_url, local_path = clone_url_for_entry(entry, repo)
    identity = str(local_path) if local_path else clone_url
    return f"{identity}#{entry.get('ref') or ''}"


def checkout_remote_source(
    clone_url: str,
    ref: str | None,
    sparse_paths: tuple[str, ...],
    destination: Path,
) -> Path:
    """
    Materialize only the source directories this script actually reads.

    The script needs a handful of `_shared` directories, so a full checkout of
    a large suite repository is wasted transfer and wasted working-tree writes.
    Cone-mode sparse checkout limits the working tree to `sparse_paths` (plus
    the files sitting directly in their parent directories), and the blobless
    partial fetch limits transfer to the objects those paths need.

    Servers without partial-clone support warn and send an ordinary shallow
    pack; the sparse working tree is unaffected. Requires Git 2.25+ for
    `git sparse-checkout`.
    """
    if not sparse_paths:
        raise SetupError(
            f"Refusing to check out {clone_url!r} without any sparse paths."
        )

    git = require_command("git")
    git_env = lf_git_environment()

    destination.mkdir(parents=True, exist_ok=False)

    run((git, "init", destination), env=git_env)
    run(
        (git, "-C", destination, "remote", "add", "origin", clone_url),
        env=git_env,
    )
    run(
        (git, "-C", destination, "sparse-checkout", "init", "--cone"),
        env=git_env,
    )
    run(
        (git, "-C", destination, "sparse-checkout", "set", *sparse_paths),
        env=git_env,
    )
    run(
        (
            git,
            "-C",
            destination,
            "fetch",
            "--depth",
            "1",
            "--no-tags",
            "--filter=blob:none",
            "origin",
            # An unpinned entry still resolves against the remote default
            # branch, which `HEAD` names without a second round trip.
            ref or "HEAD",
        ),
        env=git_env,
    )
    run(
        (
            git,
            "-C",
            destination,
            "checkout",
            "--detach",
            "FETCH_HEAD",
        ),
        env=git_env,
    )

    return destination


def source_root_for_entry(
    entry: dict[str, Any],
    repo: Path,
    temp_root: Path,
    cache: dict[str, Path],
    sparse_paths_by_source: dict[str, tuple[str, ...]],
) -> Path:
    key = source_cache_key(entry, repo)

    if key in cache:
        return cache[key]

    clone_url, local_path = clone_url_for_entry(entry, repo)

    if local_path is not None:
        cache[key] = local_path
        return local_path

    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:12]
    checkout = temp_root / f"source-{digest}"

    root = checkout_remote_source(
        clone_url,
        entry.get("ref"),
        sparse_paths_by_source[key],
        checkout,
    )
    cache[key] = root
    return root


def shared_dir_relative(
    skill_name: str,
    entry: dict[str, Any],
) -> PurePosixPath:
    """
    Return the source-relative sibling `_shared` directory for one skill.

    skills/brooks-review/SKILL.md -> skills/_shared
    """
    raw = entry.get("skillPath")

    if not raw:
        raise SetupError(
            f"Skill {skill_name!r} references `{SHARED_REFERENCE}` but its "
            "lock entry has no `skillPath`. Re-add it with the current "
            "`skills@latest` CLI to refresh the lock entry."
        )

    skill_path = PurePosixPath(raw)

    if skill_path.name != "SKILL.md":
        raise SetupError(
            f"Unexpected skillPath for {skill_name!r}: {raw!r}. "
            "Expected a path ending in SKILL.md."
        )

    return skill_path.parent.parent / "_shared"


def locate_source_shared_dir(
    source_root: Path,
    skill_name: str,
    entry: dict[str, Any],
) -> Path:
    shared_relative = shared_dir_relative(skill_name, entry)
    shared_dir = source_root.joinpath(*shared_relative.parts)

    if not shared_dir.is_dir():
        raise SetupError(
            f"Skill {skill_name!r} references `{SHARED_REFERENCE}`, but its "
            f"sibling source directory was not found:\n  {shared_dir}"
        )

    return shared_dir


def rewrite_shared_references(skill_dir: Path) -> int:
    changed = 0
    needle = SHARED_REFERENCE.encode("utf-8")

    for path in iter_regular_files(skill_dir):
        raw = path.read_bytes()

        if needle not in raw:
            continue

        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SetupError(
                f"File contains `{SHARED_REFERENCE}` but is not UTF-8 text: "
                f"{path}"
            ) from exc

        updated = text.replace(
            SHARED_REFERENCE,
            VENDORED_SHARED_REFERENCE,
        )

        if updated != text:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1

    return changed


def vendor_shared_resources(
    installed_skill_dir: Path,
    shared_source_dir: Path,
) -> int:
    """
    Normalize a sibling-shared suite module into one self-contained skill.
    """
    destination = installed_skill_dir / "references" / "_shared"

    if destination.exists():
        shutil.rmtree(destination)

    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        shared_source_dir,
        destination,
        symlinks=False,
    )

    changed = rewrite_shared_references(installed_skill_dir)

    if contains_shared_reference(installed_skill_dir):
        raise SetupError(
            f"Failed to normalize all `{SHARED_REFERENCE}` references in "
            f"{installed_skill_dir}"
        )

    return changed


def plan_sparse_paths(
    repo: Path,
    skills: dict[str, dict[str, Any]],
    candidates: Iterable[str],
) -> dict[str, tuple[str, ...]]:
    """
    Union, per source, every directory that source's checkout must contain.

    A single checkout is cached and reused across all skills declared from the
    same source and ref, so its sparse patterns have to be complete before the
    first fetch. Planning up front also fails on an unusable `skillPath`
    before any network work is done.
    """
    grouped: dict[str, set[str]] = {}

    for skill_name in candidates:
        entry = skills[skill_name]
        key = source_cache_key(entry, repo)
        relative = shared_dir_relative(skill_name, entry).as_posix()
        grouped.setdefault(key, set()).add(relative)

    return {key: tuple(sorted(paths)) for key, paths in grouped.items()}


def repair_non_self_contained_skills(
    repo: Path,
    lock_before_sync: dict[str, Any],
    agents: tuple[str, ...],
) -> None:
    skills: dict[str, dict[str, Any]] = lock_before_sync["skills"]

    candidates: list[str] = []

    for skill_name in sorted(skills):
        physical_dirs = unique_installed_skill_dirs(
            repo,
            skill_name,
            agents,
        )
        if any(contains_shared_reference(path) for path in physical_dirs):
            candidates.append(skill_name)

    print("\n== Shared-resource normalization ==")

    if not candidates:
        print("No parent-relative ../_shared dependencies detected.")
        return

    print(
        "Normalizing sibling `_shared` dependencies for: "
        + ", ".join(candidates)
    )

    sparse_paths = plan_sparse_paths(repo, skills, candidates)

    with tempfile.TemporaryDirectory(prefix="set_up_agent_skills_") as temp:
        temp_root = Path(temp)
        source_cache: dict[str, Path] = {}

        for skill_name in candidates:
            entry = skills[skill_name]
            source_root = source_root_for_entry(
                entry,
                repo,
                temp_root,
                source_cache,
                sparse_paths,
            )
            shared_source = locate_source_shared_dir(
                source_root,
                skill_name,
                entry,
            )

            for installed_dir in unique_installed_skill_dirs(
                repo,
                skill_name,
                agents,
            ):
                changed = vendor_shared_resources(
                    installed_dir,
                    shared_source,
                )
                print(
                    f"  {skill_name}: vendored `_shared` as "
                    f"{installed_dir.relative_to(repo)}/references/_shared "
                    f"and rewrote {changed} file(s)"
                )


def verify_final_state(
    repo: Path,
    declared_skills: set[str],
    agents: tuple[str, ...],
) -> None:
    print("\n== Verify generated Agent Skills ==")

    for root in selected_roots(repo, agents):
        relative_root = root.relative_to(repo)

        if not root.is_dir():
            raise SetupError(f"Missing generated skill root: {root}")

        discovered = {
            child.name
            for child in root.iterdir()
            if child.is_dir() and (child / "SKILL.md").is_file()
        }

        unexpected = discovered - declared_skills
        missing = declared_skills - discovered

        if unexpected or missing:
            details: list[str] = []

            if missing:
                details.append("missing=" + ", ".join(sorted(missing)))
            if unexpected:
                details.append(
                    "unexpected=" + ", ".join(sorted(unexpected))
                )

            raise SetupError(
                f"Generated root {relative_root} does not match "
                f"{LOCK_FILENAME}: {'; '.join(details)}"
            )

        print(
            f"  OK  {relative_root}: "
            f"{len(declared_skills)} declared skill(s)"
        )


def verify_lock_skill_set_unchanged(
    repo: Path,
    expected_skills: set[str],
) -> None:
    _, current, _ = load_lock(repo)
    actual = set(current["skills"])

    if actual != expected_skills:
        raise SetupError(
            "`npx skills` changed the declared skill set unexpectedly.\n"
            f"Before: {', '.join(sorted(expected_skills))}\n"
            f"After:  {', '.join(sorted(actual))}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Synchronize generated repo-local Agent Skills from the existing "
            "skills-lock.json project lock."
        )
    )
    parser.add_argument(
        "--agent",
        action="append",
        choices=sorted(AGENT_SKILL_ROOTS),
        dest="agents",
        help=(
            "Target agent. Repeat for multiple agents. Default: codex, "
            "antigravity, claude-code."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        require_python_version()
        require_command("git")
        npx = require_command("npx")

        repo = derive_repo_from_script()
        agents = tuple(dict.fromkeys(args.agents or DEFAULT_AGENTS))

        lock_path, lock_before, raw_before = load_lock(repo)
        declared_skills = set(lock_before["skills"])

        print(f"Repository: {repo}")
        print(f"Declaration: {lock_path}")
        print(f"Target agents: {', '.join(agents)}")
        print(f"Declared skills: {len(declared_skills)}")

        roots = selected_roots(repo, agents)
        ensure_generated_roots_are_safe(repo, roots)
        reset_generated_roots(repo, roots)

        print("\n== Synchronize declared skills from current upstream ==")

        by_source = group_skills_by_install_source(lock_before["skills"])
        print(f"Source checkouts required: {len(by_source)}")

        for source, skill_names in sorted(by_source.items()):
            print(f"\n-- {source}: {', '.join(skill_names)} --")
            sync_source(repo, npx, source, skill_names, agents)

            for skill_name in skill_names:
                verify_skill_present(repo, skill_name, agents)

        verify_lock_skill_set_unchanged(repo, declared_skills)

        repair_non_self_contained_skills(
            repo,
            lock_before,
            agents,
        )
        verify_final_state(repo, declared_skills, agents)

        raw_after = lock_path.read_bytes()

        print("\nAgent Skill setup is complete.")
        print(
            "Rerun this same script to refresh all declared skills from their "
            "current upstream sources."
        )

        if raw_after != raw_before:
            print(
                "\nNOTE: `npx skills` updated skills-lock.json while "
                "refreshing upstream content. Review and commit that diff if "
                "it represents the state you want the repository to declare."
            )
        else:
            print("\nskills-lock.json did not change.")

        return 0

    except (SetupError, subprocess.CalledProcessError, OSError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
