#!/usr/bin/env python3
r"""
Synchronize repo-local Agent Skills from the standard npx-skills project lock.

EXPECTED LOCATION
-----------------
    <repo>/<scripts>/set_up_agent_skills.py

Expected repository layout:

    <repo>/
    ├── skills-lock.json
    └── <scripts>/
        └── set_up_agent_skills.py

`<scripts>` is whatever directory one level below the repository root holds this
file; its name is never inspected, so `scripts/`, `util/` and anything else work
identically.

Commit both files. Generated activation directories should be Git-ignored:

    .agents/skills/
    .claude/skills/

The script introduces no custom manifest or schema. `skills-lock.json` v1 is the
existing project lock format written by the `skills` CLI, so the declared set of
skills lives in one place instead of being duplicated between a lock file and a
hardcoded list of install commands.

Default targets: codex, antigravity, claude-code.

Without --local-only, this script requires reviewed immutable remote refs and re-adds each
declared skill from its recorded source using the locked project-local Skills CLI. Skills sharing a
source are re-added in a single invocation, because `skills add` clones the whole
source repository once per call.

For upstream suites that reference a sibling `../_shared/`, the script detects
that dependency, vendors the source `_shared` directory into the generated skill
at `references/_shared/`, and rewrites the generated references. This makes
selected bundle modules self-contained and avoids `_shared` collisions.

That vendoring step reads upstream through a shallow, blobless, cone-mode sparse
checkout restricted to the `_shared` directories actually needed, so a large
suite repository is never materialized in full. Requires Git 2.25+.
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

from _commands import SetupError, require_command, run
from _repository import derive_repo_from_script, is_ignored, tracked_paths_under
from set_up_mcp_servers import (
    RenderedRepositoryConfigurationDocument,
    ensure_repository_configuration_destinations_are_safe,
    publish_repository_configuration_documents,
)

LOCAL_SKILL_SOURCE_ROOT = Path(".sdlc") / "skills"
SKILL_POLICY_PATH = Path(".sdlc") / "skill-policies.json"
SUPPORTED_SKILL_POLICY_VERSION = 1
FULL_GIT_SHA = re.compile(r"^[0-9a-fA-F]{40}$")
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

BROOKS_REVIEW_SKILL = "brooks-review"
BROOKS_REVIEW_SOURCE = "hyhmrright/brooks-lint"
BROOKS_REVIEW_OPENAI_YAML = """interface:
  display_name: "Brooks Review"
  short_description: "Maintainability and design-decay review"
  default_prompt: >
    Use $brooks-review as a separate maintainability-focused review of the
    scope I explicitly provide.

policy:
  allow_implicit_invocation: false
"""


def lf_git_environment() -> dict[str, str]:
    """
    Return a child-process environment that forces Git checkouts to retain LF.

    npx-skills currently hashes the checked-out skill contents in its project
    lock. Inheriting a user's Windows core.autocrlf=true can therefore produce a
    different computedHash from an otherwise identical Unix checkout.

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


def require_python_version() -> None:
    if sys.version_info < (3, 14):
        raise SetupError(
            "Python 3.14 or newer is required; use the selected latest stable patch in .python-version. "
            f"Running: {sys.version.split()[0]}"
        )


def load_lock(repo: Path) -> tuple[Path, dict[str, Any], bytes]:
    lock_path = repo / LOCK_FILENAME

    if not lock_path.is_file():
        raise SetupError(
            f"Missing {LOCK_FILENAME} at repository root: {lock_path}\n"
            "Create it by adding desired project skills with "
            "`npm exec --no -- skills add ...`, then commit it."
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
        raise SetupError(f"Lock entry for {skill_name!r} must be a JSON object.")

    for field in ("source", "sourceType", "computedHash"):
        value = entry.get(field)
        if not isinstance(value, str) or not value:
            raise SetupError(
                f"Lock entry {skill_name!r} requires non-empty string `{field}`."
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
            f"Lock entry {skill_name!r} field `subagents` must be an array of "
            "strings when present."
        )


def selected_roots(repo: Path, agents: tuple[str, ...]) -> tuple[Path, ...]:
    roots: list[Path] = []

    for agent in agents:
        root = repo / AGENT_SKILL_ROOTS[agent]
        for component in (root, root.parent):
            is_junction = component.is_junction
            if component.is_symlink() or is_junction():
                raise SetupError(
                    f"Generated activation roots must not redirect through links: {component}"
                )
        root = root.resolve(strict=False)
        if root not in roots:
            roots.append(root)

    return tuple(roots)


def ensure_generated_roots_are_safe(repo: Path, roots: tuple[Path, ...]) -> None:
    """
    Require generated roots to be untracked and ignored before rebuilding them.
    """
    for root in roots:
        relative = root.relative_to(repo).as_posix()

        tracked = tracked_paths_under(repo, relative)
        if tracked:
            rendered = "\n".join(f"  - {line}" for line in tracked)
            raise SetupError(
                f"Refusing to manage {relative}: Git tracks files underneath "
                f"it:\n{rendered}\n"
                "These activation directories must contain generated files only."
            )

        probe = f"{relative}/.set_up_agent_skills_ignore_probe"

        if not is_ignored(repo, probe):
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






def is_bare_shorthand(source: str) -> bool:
    return (
        ":" not in source
        and not source.startswith(".")
        and not source.startswith("/")
    )


def get_install_source(entry: dict[str, Any]) -> str:
    """
    Bind a canonical Git repository to the lock's single immutable revision.

    The explicit --skill filter keeps updates name-scoped, so skillPath does not
    need to be appended here. This accepts repository-root lock representations,
    not the CLI's interactive tree, archive, alias or embedded-ref syntax.
    Skills CLI remains responsible for fetching and installing that source.
    """
    source_type = entry["sourceType"]
    source = entry["source"]
    candidate = entry.get("sourceUrl") or source
    if source_type == "local":
        if candidate != source or not (
            Path(source).is_absolute() or source in {".", ".."}
            or source.startswith(("./", "../"))
        ):
            raise SetupError("Local skill source must be an explicit filesystem path, not a remote source or shorthand.")
        return candidate

    ref = entry.get("ref")
    if not isinstance(ref, str) or FULL_GIT_SHA.fullmatch(ref) is None:
        raise SetupError("Remote Agent Skills require a reviewed full Git commit SHA in ref.")
    if source_type not in {"github", "gitlab", "git"}:
        raise SetupError(f"Source type {source_type!r} cannot be pinned to a Git commit.")

    clone_url, _ = clone_url_for_entry(entry, Path.cwd())
    canonical_sources = {clone_url, clone_url.removesuffix(".git")}
    if clone_url.startswith("https://github.com/"):
        canonical_sources.add(clone_url.removeprefix("https://github.com/").removesuffix(".git"))
    if candidate not in canonical_sources:
        raise SetupError("Remote skill source must be a canonical repository root; put its revision only in ref.")

    # Restrict lock inputs to unambiguous clone endpoints shared by the native
    # Skills consumer and the existing Git _shared-resource checkout. In
    # particular, appending #SHA to a tree/download URL does not pin that URL.
    if any(char.isspace() or ord(char) < 32 or char in "?#%\\" for char in clone_url):
        raise SetupError("Remote skill source must be an unescaped canonical Git clone URL.")
    parsed = urlsplit(clone_url if not clone_url.startswith("git@") else "ssh://" + clone_url.replace(":", "/", 1))
    configured_github_host = urlsplit("https://" + os.environ.get("GH_HOST", "").strip()).hostname
    path_parts = parsed.path.removeprefix("/").split("/")
    if (parsed.scheme not in {"http", "https", "ssh"} or not parsed.hostname
            or not parsed.path.endswith(".git")
            or any(part in {"", ".", "..", "-"} for part in path_parts)
            or parsed.hostname in {"raw.githubusercontent.com", "codeload.github.com", "objects.githubusercontent.com"}
            or (parsed.hostname in {"github.com", configured_github_host}
                and len(path_parts) != 2)
            or any(host + "/" in clone_url and parsed.hostname != host for host in ("github.com", "gitlab.com"))):
        raise SetupError("Remote skill source must be a canonical Git clone endpoint, without tree or download selectors.")

    return f"{clone_url}#{ref}"


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
    source: str,
    skill_names: tuple[str, ...],
    agents: tuple[str, ...],
) -> None:
    cli_manifest = repo / "node_modules" / "skills" / "package.json"
    if not cli_manifest.is_file():
        raise SetupError("Install the locked Skills CLI before external skill setup.")
    manifest = json.loads(cli_manifest.read_text(encoding="utf-8"))
    cli_entry = cli_manifest.parent / manifest["bin"]["skills"]
    command: list[str] = [require_command("node"), str(cli_entry), "add", source]

    for skill_name in skill_names:
        command.extend(("--skill", skill_name))

    for agent in agents:
        command.extend(("--agent", agent))

    command.append("--yes")

    run(command, cwd=repo, env=lf_git_environment())


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
            f"The pinned Skills CLI did not materialize {skill_name!r} in all expected "
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
            raise SetupError(f"Could not inspect installed file: {path}") from exc

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


def configure_brooks_review_invocation_policy(
    repo: Path,
    skills: dict[str, dict[str, Any]],
    agents: tuple[str, ...],
) -> tuple[Path, ...]:
    """Make the upstream Brooks Review skill explicit-only for Codex."""
    entry = skills.get(BROOKS_REVIEW_SKILL)

    if entry is None or entry.get("source") != BROOKS_REVIEW_SOURCE:
        return ()

    configured: list[Path] = []

    for skill_dir in unique_installed_skill_dirs(
        repo,
        BROOKS_REVIEW_SKILL,
        agents,
    ):
        metadata = skill_dir / "agents" / "openai.yaml"
        resolved_metadata = metadata.resolve(strict=False)

        try:
            resolved_metadata.relative_to(skill_dir)
        except ValueError as exc:
            raise SetupError(
                "Refusing to configure Brooks Review metadata outside its "
                f"installed skill directory:\n  {resolved_metadata}"
            ) from exc

        if metadata.is_symlink():
            raise SetupError(
                "Refusing to replace symlinked Brooks Review metadata:\n"
                f"  {metadata}"
            )

        if metadata.exists() and not metadata.is_file():
            raise SetupError(
                "Brooks Review metadata path is not a regular file:\n"
                f"  {metadata}"
            )

        metadata.parent.mkdir(parents=True, exist_ok=True)
        metadata.write_text(
            BROOKS_REVIEW_OPENAI_YAML,
            encoding="utf-8",
            newline="\n",
        )
        configured.append(metadata)

    return tuple(configured)


def validate_locked_skill_sources(
    skills: dict[str, dict[str, Any]],
) -> None:
    """Preflight every effective remote source before any installer can run."""
    invalid_sources: list[str] = []

    for skill_name, entry in sorted(skills.items()):
        try:
            get_install_source(entry)
        except SetupError as exc:
            invalid_sources.append(f"{skill_name}: {exc}")

    if invalid_sources:
        rendered = "\n".join(f"  - {item}" for item in invalid_sources)
        raise SetupError(
            "Remote Agent Skills must be frozen to reviewed full Git commit "
            f"SHAs before normal setup:\n{rendered}\n\n"
            "Resolve each upstream once with `git ls-remote`, add it through "
            "the project-local Skills CLI using `#<full-sha>`, review the resulting lock and "
            "skill diff, then obtain the required configuration and commit approvals."
        )


def discover_local_skills(repo: Path) -> dict[str, Path]:
    """Discover repository-local skill sources without introducing another manifest."""
    root = repo / LOCAL_SKILL_SOURCE_ROOT
    if not root.exists():
        return {}
    if not root.is_dir() or root.is_symlink() or root.is_junction():
        raise SetupError(f"Local skill source root must be a real directory: {root}")

    discovered: dict[str, Path] = {}
    for child in sorted(root.iterdir(), key=lambda item: item.name):
        if not child.is_dir() or child.is_symlink() or child.is_junction():
            continue
        skill_md = child / "SKILL.md"
        if not skill_md.is_file() or skill_md.is_symlink():
            continue
        if not child.name.strip():
            raise SetupError(f"Invalid empty local skill directory name: {child}")
        discovered[child.name] = child.resolve()
    return discovered


def load_skill_policy(repo: Path) -> tuple[bool, dict[str, bool]]:
    path = repo / SKILL_POLICY_PATH
    if not path.is_file():
        return False, {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SetupError(f"{SKILL_POLICY_PATH} is not valid JSON.") from exc

    if not isinstance(data, dict) or data.get("version") != SUPPORTED_SKILL_POLICY_VERSION:
        raise SetupError(
            f"{SKILL_POLICY_PATH} must be a version "
            f"{SUPPORTED_SKILL_POLICY_VERSION} JSON object."
        )
    default = data.get("defaultAllowImplicitInvocation", False)
    overrides = data.get("overrides", {})
    if not isinstance(default, bool) or not isinstance(overrides, dict):
        raise SetupError(f"Invalid invocation policy in {SKILL_POLICY_PATH}.")
    if not all(isinstance(k, str) and isinstance(v, bool) for k, v in overrides.items()):
        raise SetupError(f"Every {SKILL_POLICY_PATH} override must map a skill name to a boolean.")
    return default, overrides


def humanize_skill_name(skill_name: str) -> str:
    return " ".join(part.capitalize() for part in skill_name.replace("_", "-").split("-") if part)


def set_openai_invocation_policy(metadata: Path, skill_name: str, allowed: bool) -> None:
    """Modify semantic YAML data through its supported parser, not line substitution."""
    import yaml
    if any(p.is_symlink() or p.is_junction() for p in (metadata, *metadata.parents)) or (metadata.exists() and not metadata.is_file()):
        raise SetupError(f"Expected regular skill metadata file: {metadata}")
    try:
        data = yaml.safe_load(metadata.read_text(encoding="utf-8")) if metadata.exists() else {}
    except yaml.YAMLError as exc:
        raise SetupError(f"Invalid YAML metadata: {metadata}") from exc
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise SetupError(f"Skill metadata must be a mapping: {metadata}")
    policy = data.setdefault("policy", {})
    if not isinstance(policy, dict):
        raise SetupError(f"Skill policy must be a mapping: {metadata}")
    policy["allow_implicit_invocation"] = allowed
    data.setdefault("interface", {
        "display_name": humanize_skill_name(skill_name),
        "short_description": "Repository-curated Agent Skill",
        "default_prompt": f"Use ${skill_name} only for the explicit scope I provide.",
    })
    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8", newline="\n")


def configure_skill_invocation_policies(
    repo: Path,
    skill_names: set[str],
    agents: tuple[str, ...],
) -> tuple[Path, ...]:
    default, overrides = load_skill_policy(repo)
    unknown = set(overrides) - skill_names
    if unknown:
        raise SetupError(
            f"{SKILL_POLICY_PATH} names skills that are not installed: "
            + ", ".join(sorted(unknown))
        )

    configured: list[Path] = []
    for skill_name in sorted(skill_names):
        allowed = overrides.get(skill_name, default)
        for skill_dir in unique_installed_skill_dirs(repo, skill_name, agents):
            metadata = skill_dir / "agents" / "openai.yaml"
            set_openai_invocation_policy(metadata, skill_name, allowed)
            configured.append(metadata)
            print(
                f"  {skill_name}: allow_implicit_invocation={str(allowed).lower()} "
                f"in {metadata.relative_to(repo)}"
            )
    return tuple(configured)


def install_local_skills(repo: Path, local_skills: dict[str, Path], agents: tuple[str, ...]) -> None:
    """Publish only declared local skill files, preserving unrelated skills."""
    documents = []
    for root in selected_roots(repo, agents):
        for name, source in sorted(local_skills.items()):
            for source_file in sorted(source.rglob("*")):
                if source_file.is_symlink() or source_file.is_junction():
                    raise SetupError(f"Local skill resources cannot redirect: {source_file}")
                if not source_file.is_file():
                    continue
                destination = root / name / source_file.relative_to(source)
                relative = destination.relative_to(repo)
                ensure_repository_configuration_destinations_are_safe(repo, [relative])
                observed = destination.read_bytes() if destination.exists() else None
                contents = source_file.read_text(encoding="utf-8")
                documents.append(RenderedRepositoryConfigurationDocument(
                    destination, contents, observed))
    publish_repository_configuration_documents(repo, documents)


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
        return f"https://github.com/{source.removesuffix('.git')}.git", None

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
                urlunsplit((parts.scheme, parts.netloc, clean_path, "", "")),
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

    The script needs a handful of `_shared` directories, so a full checkout of a
    large suite repository is wasted transfer and wasted working-tree writes.
    Cone-mode sparse checkout limits the working tree to `sparse_paths` (plus the
    files sitting directly in their parent directories), and the blobless partial
    fetch limits transfer to the objects those paths need.

    Servers without partial-clone support warn and send an ordinary shallow pack;
    the sparse working tree is unaffected. Requires Git 2.25+ for
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
    run((git, "-C", destination, "remote", "add", "origin", clone_url), env=git_env)
    run((git, "-C", destination, "sparse-checkout", "init", "--cone"), env=git_env)
    run((git, "-C", destination, "sparse-checkout", "set", *sparse_paths), env=git_env)
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
    run((git, "-C", destination, "checkout", "--detach", "FETCH_HEAD"), env=git_env)

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
            f"Skill {skill_name!r} references `{SHARED_REFERENCE}` but its lock "
            "entry has no `skillPath`. Re-add it with the current "
            "pinned Skills CLI to refresh the lock entry."
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

        updated = text.replace(SHARED_REFERENCE, VENDORED_SHARED_REFERENCE)

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
    shutil.copytree(shared_source_dir, destination, symlinks=False)

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
    first fetch. Planning up front also fails on an unusable `skillPath` before
    any network work is done.
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
        physical_dirs = unique_installed_skill_dirs(repo, skill_name, agents)
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
                changed = vendor_shared_resources(installed_dir, shared_source)
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

        missing = declared_skills - discovered

        if missing:
            details: list[str] = []

            if missing:
                details.append("missing=" + ", ".join(sorted(missing)))

            raise SetupError(
                f"Generated root {relative_root} is missing declarations from "
                f"{LOCK_FILENAME}: {'; '.join(details)}"
            )

        print(
            f"  OK  {relative_root}: {len(declared_skills)} declared skill(s)"
        )


def verify_lock_skill_set_unchanged(repo: Path, expected_skills: set[str]) -> None:
    _, current, _ = load_lock(repo)
    actual = set(current["skills"])

    if actual != expected_skills:
        raise SetupError(
            "The pinned Skills CLI changed the declared skill set unexpectedly.\n"
            f"Before: {', '.join(sorted(expected_skills))}\n"
            f"After:  {', '.join(sorted(actual))}"
        )


def preflight_local_skill_activation(repo: Path, agents: tuple[str, ...]) -> dict[str, Path]:
    """Check local prerequisites before a caller publishes repository configuration."""
    require_python_version()
    import yaml
    _, lock, _ = load_lock(repo)
    local = discover_local_skills(repo)
    collisions = set(lock["skills"]) & set(local)
    if collisions:
        raise SetupError("Local/external skill declaration collision: " + ", ".join(sorted(collisions)))
    load_skill_policy(repo)
    roots = selected_roots(repo, agents)
    ensure_generated_roots_are_safe(repo, roots)
    for root in roots:
        for name, source in local.items():
            for item in source.rglob("*"):
                if item.is_symlink() or item.is_junction():
                    raise SetupError(f"Local skill resources cannot redirect: {item}")
                if item.is_file():
                    ensure_repository_configuration_destinations_are_safe(repo, [(root / name / item.relative_to(source)).relative_to(repo)])
                    if item.name == "openai.yaml":
                        metadata = yaml.safe_load(item.read_text(encoding="utf-8"))
                        if not isinstance(metadata, dict) or not isinstance(metadata.get("policy", {}), dict):
                            raise SetupError(f"Invalid native skill metadata: {item}")
    return local


def ensure_agent_skills(repo: Path, agents: tuple[str, ...], *, local_only: bool = False) -> set[str]:
    """
    Activate selected local files or reviewed external declarations without clearing roots.

    Returns the declared skill names, so a caller sequencing several setup steps
    can report them without re-reading the lock.
    """
    require_python_version()
    require_command("git")
    import yaml  # Preflight the existing native metadata parser before writes.

    lock_path, lock_before, raw_before = load_lock(repo)
    declared_skills = set(lock_before["skills"])
    local_skills = discover_local_skills(repo)
    collisions = declared_skills & set(local_skills)
    if collisions:
        raise SetupError("Local/external skill declaration collision: " + ", ".join(sorted(collisions)))
    if local_only:
        preflight_local_skill_activation(repo, agents)
        roots = selected_roots(repo, agents)
        ensure_generated_roots_are_safe(repo, roots)
        install_local_skills(repo, local_skills, agents)
        configure_skill_invocation_policies(repo, set(local_skills), agents)
        verify_final_state(repo, set(local_skills), agents)
        return set(local_skills)
    validate_locked_skill_sources(lock_before["skills"])

    print("\n== Repository-local Agent Skills ==")
    print(f"Declaration: {lock_path}")
    print(f"Target agents: {', '.join(agents)}")
    print(f"Declared skills: {len(declared_skills)}")

    roots = selected_roots(repo, agents)
    ensure_generated_roots_are_safe(repo, roots)
    # Native name-scoped installation preserves other standalone skills.

    print("\n== Synchronize declared skills from current upstream ==")

    by_source = group_skills_by_install_source(lock_before["skills"])
    print(f"Source checkouts required: {len(by_source)}")

    for source, skill_names in sorted(by_source.items()):
        print(f"\n-- {source}: {', '.join(skill_names)} --")
        sync_source(repo, source, skill_names, agents)

        for skill_name in skill_names:
            verify_skill_present(repo, skill_name, agents)

    verify_lock_skill_set_unchanged(repo, declared_skills)

    repair_non_self_contained_skills(repo, lock_before, agents)

    print("\n== Codex skill invocation policies ==")
    configured_metadata = configure_brooks_review_invocation_policy(
        repo,
        lock_before["skills"],
        agents,
    )

    if configured_metadata:
        for metadata in configured_metadata:
            print(
                "  brooks-review: disabled implicit invocation in "
                f"{metadata.relative_to(repo)}"
            )
    else:
        print("No repository-specific invocation policies required.")

    install_local_skills(repo, local_skills, agents)
    configure_skill_invocation_policies(repo, set(local_skills), agents)
    verify_final_state(repo, declared_skills | set(local_skills), agents)

    if lock_path.read_bytes() != raw_before:
        print(
            f"\nNOTE: The pinned Skills CLI updated {LOCK_FILENAME} while refreshing "
            "upstream content.\n      Review and commit that diff if it "
            "represents the state you want the\n      repository to declare."
        )
    else:
        print(f"\n{LOCK_FILENAME} did not change.")

    return declared_skills


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

    parser.add_argument("--local-only", action="store_true",
                        help="Activate repository-owned skills; preserve installed external skills and their lock.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        repo = derive_repo_from_script(__file__)
        agents = tuple(dict.fromkeys(args.agents or DEFAULT_AGENTS))

        print(f"Repository root: {repo}")

        ensure_agent_skills(repo, agents, local_only=args.local_only)

        print("\nAgent Skill setup is complete.")
        print(
            "Rerun this same script to refresh all declared skills from their "
            "current upstream sources."
        )

        return 0

    except (SetupError, subprocess.CalledProcessError, OSError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)

        return 1


if __name__ == "__main__":
    raise SystemExit(main())
