#!/usr/bin/env python3
r"""
Install repository-local MCP servers and point every supported agent host at
them.

EXPECTED LOCATION
-----------------
    <repo>/<scripts>/set_up_mcp_servers.py

`<scripts>` is whatever directory one level below the repository root holds this
file; its name is never inspected. The repository root is derived from this
script's own location, so the current working directory is irrelevant.

Rerunning this script IS the update mechanism. The latest release is re-resolved
every time, but the download is skipped while the recorded release still matches
the installed executable.

Generated state
---------------
- .agent-tools/bin/github-mcp-server[.exe]
- .agent-tools/bin/universal-ontology-mcp-server.mjs
- .agent-tools/.set_up_mcp_servers.lock
- .agent-tools/github-mcp-server/installation.json
- .agent-tools/universal-ontology-mcp-server/installation.json
- .mcp.json                                    (Claude Code)
- .codex/config.toml                           (Codex, marker-delimited block)
- .agents/mcp_config.json                      (Antigravity)

Each host configuration asks Git for the current checkout root before resolving
the server's repository-relative entry point. The launch therefore remains
correct when the clone moves and when an agent session starts in a repository
subdirectory. No credential is configured: on github.com the server runs its
own browser-based OAuth flow on first use and keeps the resulting token in
memory only. That flow runs only when no token is set, so the generated
configuration deliberately neither names nor forwards a personal access token.

This script intentionally DOES NOT:
- install a server through `go install`, npm, or any global package manager
- modify user-level ~/.codex, ~/.claude, or ~/.gemini configuration
- store any GitHub credential
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request
import zipfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Sequence

from _commands import SetupError, require_command, run
from _repository import (
    derive_repo_from_script,
    git_output,
    is_ignored,
    tracked_paths_under,
)

SETUP_SCRIPT_PATH = Path(__file__).resolve()

GITHUB_MCP_RELEASES_API = (
    "https://api.github.com/repos/github/github-mcp-server/releases/latest"
)
GITHUB_MCP_RELEASES_PAGE = "https://github.com/github/github-mcp-server/releases"

GITHUB_MCP_HOST_CONFIGURATION_NAME = "github"
LEGACY_GITHUB_MCP_HOST_CONFIGURATION_NAME = "github-mcp-server"
GITHUB_MCP_RELEASE_EXECUTABLE_FILE_NAME_STEM = "github-mcp-server"

# Project-scoped host configuration can be discovered while the agent's session
# starts in any repository subdirectory. Node would otherwise interpret a
# repository-relative entry point beneath that session directory. Keep this
# bootstrap intentionally small: Git authoritatively identifies the checkout;
# the existing entry point retains ownership of all server-specific behavior.
REPOSITORY_ROOTED_NODE_ENTRY_POINT_BOOTSTRAP_SOURCE = (
    'import { execFileSync } from "node:child_process";'
    'import { resolve } from "node:path";'
    'import { pathToFileURL } from "node:url";'
    "const repositoryRootPath = execFileSync("
    '"git",["rev-parse","--show-toplevel"],'
    '{encoding:"utf8",windowsHide:true}'
    r').replace(/\r?\n$/u,"");'
    "const [repositoryRelativeEntryPointPath,...entryPointArguments]="
    "process.argv.slice(1);"
    "const entryPointPath=resolve("
    "repositoryRootPath,repositoryRelativeEntryPointPath);"
    "process.chdir(repositoryRootPath);"
    "process.argv=[process.execPath,entryPointPath,...entryPointArguments];"
    "await import(pathToFileURL(entryPointPath).href);"
)
REPOSITORY_ROOTED_NODE_ENTRY_POINT_ARGUMENT_PREFIX = [
    "--input-type=module",
    "--eval",
    REPOSITORY_ROOTED_NODE_ENTRY_POINT_BOOTSTRAP_SOURCE,
    "--",
]
GITHUB_MCP_LAUNCHER_COMMAND = "node"

UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME = "universal_ontology"
LEGACY_UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME = (
    "universal_ontology_local"
)
UNIVERSAL_ONTOLOGY_MCP_LAUNCH_COMMAND = "node"
UNIVERSAL_ONTOLOGY_MCP_INSTALLED_APPLICATION_BUNDLE_PATH = (
    Path(".agent-tools") / "bin" / "universal-ontology-mcp-server.mjs"
)
UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_CHANNEL_NAME = "development"
UNIVERSAL_ONTOLOGY_MCP_LAUNCH_ARGUMENTS = [
    *REPOSITORY_ROOTED_NODE_ENTRY_POINT_ARGUMENT_PREFIX,
    UNIVERSAL_ONTOLOGY_MCP_INSTALLED_APPLICATION_BUNDLE_PATH.as_posix(),
    (
        "--artifact-channel="
        f"{UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_CHANNEL_NAME}"
    ),
]
UNIVERSAL_ONTOLOGY_MCP_STARTUP_TIMEOUT_SECONDS = 15
UNIVERSAL_ONTOLOGY_MCP_TOOL_TIMEOUT_SECONDS = 30
UNIVERSAL_ONTOLOGY_MCP_ENABLED_TOOL_NAMES = [
    "search_entities",
    "resolve_entity",
]
CAPTURED_MCP_VERIFIER_DIAGNOSTIC_MAXIMUM_CHARACTER_COUNT = 4_096

# Attribution written into the Codex marker comments, derived from this file's
# own location rather than hardcoded: the directory holding the setup scripts is
# `scripts/` here but may be `util/` elsewhere, and an attribution naming the
# wrong path would send a reader looking for a file that does not exist.
MCP_HOST_CONFIGURATION_MANAGER = (
    f"{SETUP_SCRIPT_PATH.parent.name}/{SETUP_SCRIPT_PATH.name}"
)

# The server authenticates through its own browser-based OAuth flow, but only
# when no token is set. This variable being present in a developer's environment
# therefore pre-empts OAuth rather than complementing it. This script never sets
# it and never writes it into a configuration file; it only reports the conflict
# when it sees one.
GITHUB_MCP_TOKEN_VARIABLE = "GITHUB_PERSONAL_ACCESS_TOKEN"

# Where the installed executable and the install record live, relative to the
# repository root. The executable sits beside the other generated wrappers.
GITHUB_MCP_INSTALLED_EXECUTABLE_DIRECTORY = Path(".agent-tools") / "bin"
GITHUB_MCP_INSTALLATION_RECORD_PATH = (
    Path(".agent-tools") / "github-mcp-server" / "installation.json"
)
GENERATED_MCP_INSTALLATION_ROOT = Path(".agent-tools")
REPOSITORY_LOCAL_MCP_SETUP_LOCK_PATH = (
    GENERATED_MCP_INSTALLATION_ROOT / ".set_up_mcp_servers.lock"
)
UNIVERSAL_ONTOLOGY_MCP_INSTALLATION_RECORD_PATH = (
    Path(".agent-tools")
    / "universal-ontology-mcp-server"
    / "installation.json"
)
UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_RELATIVE_PATH = Path(
    "packages/universal-ontology-mcp-server/dist/"
    "universal-ontology-mcp-server.mjs"
)
UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_METADATA_RELATIVE_PATH = Path(
    "dist/release-work/universal-ontology-mcp-application-bundle.json"
)
UNIVERSAL_ONTOLOGY_MCP_PACKAGE_MANIFEST_RELATIVE_PATH = Path(
    "packages/universal-ontology-mcp-server/package.json"
)
UNIVERSAL_ONTOLOGY_MCP_PACKAGE_NAME = "universal-ontology-mcp-server"
UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_SERVER_NAME = "universal-ontology"
UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_SERVER_TITLE = "Universal Ontology"
UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_METADATA_FORMAT_VERSION = 1
UNIVERSAL_ONTOLOGY_MCP_INSTALLATION_RECORD_FORMAT_VERSION = 1
GITHUB_MCP_INSTALLATION_RECORD_FORMAT_VERSION = 1
MINIMUM_NODE_MAJOR_VERSION = 24
HTTP_RESPONSE_READ_CHUNK_BYTE_COUNT = 64 * 1024
GITHUB_RELEASE_METADATA_MAXIMUM_BYTE_COUNT = 2 * 1024 * 1024
GITHUB_RELEASE_CHECKSUM_MANIFEST_MAXIMUM_BYTE_COUNT = 8 * 1024 * 1024
GITHUB_MCP_RELEASE_ARCHIVE_MAXIMUM_BYTE_COUNT = 256 * 1024 * 1024
GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT = 256 * 1024 * 1024
POSIX_FILE_EXECUTION_PERMISSION_MASK = stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
# Python 3.11 exposes Windows reparse tags through `Path.lstat()` even though
# its higher-level `Path.is_junction()` convenience method arrives only in 3.12.
# Keeping the standard Windows tag here preserves the documented 3.11 minimum
# without silently weakening the generated-root boundary on that interpreter.
WINDOWS_DIRECTORY_JUNCTION_REPARSE_TAG = getattr(
    stat,
    "IO_REPARSE_TAG_MOUNT_POINT",
    0xA0000003,
)
REPOSITORY_LOCAL_MCP_TRANSACTION_FILE_NAME_COMPONENT = "repository-mcp-setup"
REPOSITORY_LOCAL_MCP_STAGED_FILE_SUFFIX = ".staged.tmp"
REPOSITORY_LOCAL_MCP_ACTIVATION_BACKUP_FILE_SUFFIX = ".activation.backup"
# Native names and values are retained in the Python identifiers so readers can
# verify them directly against the respective operating-system headers.
LINUX_AT_FDCWD = -100
LINUX_RENAME_EXCHANGE = 0x00000002
DARWIN_RENAME_SWAP = 0x00000002
WINDOWS_REPLACE_FILE_WITH_DEFAULT_FLAGS = 0


@dataclass(frozen=True)
class BuiltUniversalOntologyMcpApplicationBundle:
    """Validated output of the repository's canonical bundle builder."""

    application_bundle_path: Path
    application_bundle_byte_length: int
    application_bundle_sha256: str
    package_name: str
    package_version: str


@dataclass(frozen=True)
class StagedMcpServerInstallation:
    """Inactive server program and record awaiting transactional activation."""

    staged_program_path: Path
    installed_program_path: Path
    staged_installation_record_path: Path
    installed_installation_record_path: Path


@dataclass(frozen=True)
class RepositoryLocalMcpSetupResult:
    """Verified programs and paths published by one successful setup run."""

    github_mcp_server_version: str
    universal_ontology_mcp_verification: dict[str, object]
    activated_paths: tuple[Path, ...]


@dataclass(frozen=True)
class RenderedMcpHostConfigurationDocument:
    """One validated rendering and the destination state it was based on.

    `observed_destination_bytes` is `None` only when the destination did not
    exist. Retaining the byte-exact observation lets activation reject a user or
    host edit made while setup was downloading and building server software.
    """

    destination_path: Path
    rendered_contents: str
    observed_destination_bytes: bytes | None


@dataclass(frozen=True)
class RegularFileContentAndPermissionState:
    """Content and permission state used to recognize our published bytes."""

    byte_length: int
    content_sha256: str
    file_permission_bits: int


@dataclass(frozen=True)
class ActivatedFileReplacement:
    """One published destination and the state needed for a safe rollback."""

    destination_path: Path
    rollback_backup_path: Path | None
    published_destination_state: RegularFileContentAndPermissionState

# Repository-local MCP configuration, one file per agent host. All three hosts
# read a `command`/`args` stdio entry; only the file format and the key path
# differ.
JSON_MCP_HOST_CONFIGURATION_DOCUMENTS = (
    (Path(".mcp.json"), "Claude Code"),
    (Path(".agents") / "mcp_config.json", "Antigravity"),
)
CHECKED_IN_JSON_MCP_HOST_CONFIGURATION_DOCUMENTS = (
    JSON_MCP_HOST_CONFIGURATION_DOCUMENTS[:1]
)
CODEX_MCP_HOST_CONFIGURATION_PATH = Path(".codex") / "config.toml"

# `platform.machine()` reports the same architecture under several names, and
# none of them are the names the release assets use.
GITHUB_MCP_RELEASE_ARCHITECTURE_BY_MACHINE_NAME = {
    "amd64": "x86_64",
    "x86_64": "x86_64",
    "x64": "x86_64",
    "aarch64": "arm64",
    "arm64": "arm64",
    "i386": "i386",
    "i686": "i386",
    "x86": "i386",
}

# Only the combinations upstream actually publishes, mapped to the archive
# format used for that operating system. Composing an asset name from parts
# without consulting this table produces a URL that 404s on exactly the platform
# nobody tested — macOS, for instance, has no 32-bit build.
GITHUB_MCP_RELEASE_ARCHIVE_EXTENSION_BY_PLATFORM = {
    ("Windows", "x86_64"): ".zip",
    ("Windows", "arm64"): ".zip",
    ("Windows", "i386"): ".zip",
    ("Darwin", "x86_64"): ".tar.gz",
    ("Darwin", "arm64"): ".tar.gz",
    ("Linux", "x86_64"): ".tar.gz",
    ("Linux", "arm64"): ".tar.gz",
    ("Linux", "i386"): ".tar.gz",
}


def ensure_generated_installation_root_is_safe(repo: Path) -> None:
    """Require generated MCP installations to be ignored and entirely untracked.

    Setup replaces files beneath `.agent-tools`. Git, rather than a pathname
    assumption, is the authority for whether that root is disposable generated
    state in the current checkout.
    """
    generated_root = GENERATED_MCP_INSTALLATION_ROOT.as_posix()
    tracked = tracked_paths_under(repo, generated_root)

    if tracked:
        listing = "\n".join(f"  - {path}" for path in tracked)
        raise SetupError(
            f"The repository tracks files beneath {generated_root}; refusing "
            f"to replace generated MCP installations:\n{listing}"
        )

    generated_installation_root = repo / GENERATED_MCP_INSTALLATION_ROOT

    if _path_is_symbolic_link_or_junction(generated_installation_root):
        raise SetupError(
            f"The generated MCP installation root {generated_root} must be a "
            "real directory, not a symbolic link or junction."
        )

    if (
        generated_installation_root.exists()
        and not generated_installation_root.is_dir()
    ):
        raise SetupError(
            f"The generated MCP installation root {generated_root} must be a "
            "directory when it exists."
        )

    if generated_installation_root.is_dir():
        for current_directory, directory_names, file_names in os.walk(
            generated_installation_root,
            followlinks=False,
        ):
            current_path = Path(current_directory)

            for entry_name in [*directory_names, *file_names]:
                entry_path = current_path / entry_name

                if _path_is_symbolic_link_or_junction(entry_path):
                    relative_entry_path = entry_path.relative_to(repo).as_posix()
                    raise SetupError(
                        "Generated MCP installation paths must not contain "
                        "symbolic links or junctions: "
                        f"{relative_entry_path}."
                    )

    ignore_probe = (
        GENERATED_MCP_INSTALLATION_ROOT
        / ".set_up_mcp_servers_ignore_probe"
    ).as_posix()

    if not is_ignored(repo, ignore_probe):
        raise SetupError(
            f"The generated MCP installation root {generated_root} is not "
            "ignored by Git. Add an exact ignore rule before running setup."
        )


def _path_is_symbolic_link_or_junction(path: Path) -> bool:
    """Recognize both POSIX-style links and Windows directory junctions."""
    if path.is_symlink():
        return True

    if os.name != "nt":
        return False

    try:
        return (
            path.lstat().st_reparse_tag
            == WINDOWS_DIRECTORY_JUNCTION_REPARSE_TAG
        )
    except FileNotFoundError:
        return False


def ensure_mcp_host_configuration_destinations_are_safe(
    repo: Path,
    relative_paths: Iterable[Path],
) -> None:
    """Reject configuration destinations that escape through link/file seams."""
    repository_root = repo.resolve()

    for relative_path in relative_paths:
        if relative_path.is_absolute() or ".." in relative_path.parts:
            raise SetupError(
                "MCP host configuration destinations must be repository-relative: "
                f"{relative_path}."
            )

        destination = repo

        for part_index, part in enumerate(relative_path.parts):
            destination /= part
            is_destination = part_index == len(relative_path.parts) - 1

            if _path_is_symbolic_link_or_junction(destination):
                raise SetupError(
                    "MCP host configuration destinations must not traverse a "
                    f"symbolic link or junction: {relative_path.as_posix()}."
                )

            if destination.exists():
                if not is_destination and not destination.is_dir():
                    raise SetupError(
                        "Every MCP host configuration parent must be a real "
                        f"directory: {destination.relative_to(repo).as_posix()}."
                    )

                if is_destination and not destination.is_file():
                    raise SetupError(
                        "An existing MCP host configuration destination must be "
                        f"a regular file: {relative_path.as_posix()}."
                    )

        try:
            destination.resolve(strict=False).relative_to(repository_root)
        except ValueError as exc:
            raise SetupError(
                "MCP host configuration destination resolves outside the "
                f"repository: {relative_path.as_posix()}."
            ) from exc


@contextmanager
def acquire_repository_local_mcp_setup_lock(repo: Path) -> Iterator[None]:
    """Hold one crash-recovering, process-scoped setup lock for this checkout."""
    lock_path = repo / REPOSITORY_LOCAL_MCP_SETUP_LOCK_PATH
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = lock_path.open("a+b")
    lock_acquired = False

    try:
        # Windows byte-range locks require the selected range to exist. The
        # persistent byte is not a stale-lock sentinel: the kernel releases the
        # actual lock automatically when this handle or process closes.
        lock_file.seek(0, os.SEEK_END)

        if lock_file.tell() == 0:
            lock_file.write(b"\0")
            lock_file.flush()
            os.fsync(lock_file.fileno())

        lock_file.seek(0)

        try:
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(
                    lock_file.fileno(),
                    fcntl.LOCK_EX | fcntl.LOCK_NB,
                )
        except OSError as exc:
            raise SetupError(
                "Cannot acquire the setup lock because another repository-local "
                f"MCP setup is already running for {repo}. Wait for it to finish "
                "before retrying."
            ) from exc

        lock_acquired = True
        yield
    finally:
        if lock_acquired:
            try:
                lock_file.seek(0)

                if os.name == "nt":
                    import msvcrt

                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl

                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            finally:
                lock_file.close()
        else:
            lock_file.close()


def github_mcp_release_archive_asset_name(system: str, machine: str) -> str:
    """Maps a `platform.system()`/`platform.machine()` pair to a release asset."""
    architecture = GITHUB_MCP_RELEASE_ARCHITECTURE_BY_MACHINE_NAME.get(
        machine.strip().lower()
    )

    if architecture is None:
        known = ", ".join(
            sorted(GITHUB_MCP_RELEASE_ARCHITECTURE_BY_MACHINE_NAME)
        )
        raise SetupError(
            "Unrecognised machine architecture for the GitHub MCP server: "
            f"{machine!r}. Recognised values: {known}."
        )

    extension = GITHUB_MCP_RELEASE_ARCHIVE_EXTENSION_BY_PLATFORM.get(
        (system, architecture)
    )

    if extension is None:
        published = ", ".join(
            f"{host}/{arch}"
            for host, arch in sorted(
                GITHUB_MCP_RELEASE_ARCHIVE_EXTENSION_BY_PLATFORM
            )
        )
        raise SetupError(
            "The GitHub MCP server publishes no release archive for "
            f"{system}/{architecture}. Published combinations: {published}.\n"
            f"See {GITHUB_MCP_RELEASES_PAGE}"
        )

    return (
        f"{GITHUB_MCP_RELEASE_EXECUTABLE_FILE_NAME_STEM}_"
        f"{system}_{architecture}{extension}"
    )


def github_mcp_executable_file_name(system: str) -> str:
    if system == "Windows":
        return f"{GITHUB_MCP_RELEASE_EXECUTABLE_FILE_NAME_STEM}.exe"

    return GITHUB_MCP_RELEASE_EXECUTABLE_FILE_NAME_STEM


def parse_sha256_checksum_manifest(text: str) -> dict[str, str]:
    """Parse unambiguous SHA-256 asset attestations from a checksum manifest."""
    checksums: dict[str, str] = {}

    for line in text.splitlines():
        fields = line.split()

        if len(fields) != 2:
            continue

        digest, name = fields

        if re.fullmatch(r"[0-9a-fA-F]{64}", digest) is None:
            continue

        # Binary-mode manifests prefix the name with an asterisk.
        asset_name = name.lstrip("*")
        normalized_digest = digest.lower()
        preceding_digest = checksums.get(asset_name)

        if (
            preceding_digest is not None
            and preceding_digest != normalized_digest
        ):
            raise SetupError(
                "Checksum manifest reports conflicting SHA-256 digests for "
                f"{asset_name}."
            )

        checksums[asset_name] = normalized_digest

    return checksums


def select_release_archive_executable_member_name(
    names: Iterable[str],
    executable_file_name: str,
    archive_path: Path,
) -> str:
    """
    Finds the server executable inside a release archive.

    Upstream keeps it at the archive root, but a leading directory is tolerated
    so a packaging change degrades into a working install rather than a failure.
    """
    archive_member_names = list(names)
    candidate_member_names = [
        name
        for name in archive_member_names
        if name == executable_file_name
        or name.endswith(f"/{executable_file_name}")
    ]

    if len(candidate_member_names) == 1:
        return candidate_member_names[0]

    if len(candidate_member_names) > 1:
        listing = ", ".join(sorted(candidate_member_names))
        raise SetupError(
            f"{archive_path.name} contains multiple candidate files named "
            f"{executable_file_name}: {listing}."
        )

    listing = ", ".join(sorted(archive_member_names)) or "(empty archive)"
    raise SetupError(
        f"{archive_path.name} does not contain {executable_file_name}. "
        f"It contains: {listing}."
    )


def _read_bounded_binary_stream(
    source,
    *,
    maximum_byte_count: int,
    description: str,
) -> bytes:
    """Read at most the declared bound, including from metadata-free streams."""
    payload = source.read(maximum_byte_count + 1)

    if len(payload) > maximum_byte_count:
        raise SetupError(
            f"{description} exceeds the maximum of {maximum_byte_count} bytes."
        )

    return payload


def _read_zip_release_archive_executable(
    archive_path: Path,
    executable_file_name: str,
) -> bytes:
    with zipfile.ZipFile(archive_path) as bundle:
        member_name = select_release_archive_executable_member_name(
            bundle.namelist(),
            executable_file_name,
            archive_path,
        )
        member = bundle.getinfo(member_name)
        unix_file_type = stat.S_IFMT(member.external_attr >> 16)

        if member.is_dir() or unix_file_type not in (0, stat.S_IFREG):
            raise SetupError(
                f"{archive_path.name} holds {member_name} as something "
                "other than a regular file."
            )

        if member.file_size > GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT:
            raise SetupError(
                f"{member_name} exceeds the maximum of "
                f"{GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT} bytes."
            )

        with bundle.open(member) as source:
            return _read_bounded_binary_stream(
                source,
                maximum_byte_count=GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT,
                description=member_name,
            )


def _read_tar_gzip_release_archive_executable(
    archive_path: Path,
    executable_file_name: str,
) -> bytes:
    with tarfile.open(archive_path, "r:gz") as bundle:
        member_name = select_release_archive_executable_member_name(
            bundle.getnames(),
            executable_file_name,
            archive_path,
        )
        member = bundle.getmember(member_name)

        if not member.isfile():
            raise SetupError(
                f"{archive_path.name} holds {member_name} as something "
                "other than a regular file."
            )

        if member.size > GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT:
            raise SetupError(
                f"{member_name} exceeds the maximum of "
                f"{GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT} bytes."
            )

        source = bundle.extractfile(member)

        if source is None:
            raise SetupError(
                f"Could not read regular file {member_name} from "
                f"{archive_path.name}."
            )

        with source:
            return _read_bounded_binary_stream(
                source,
                maximum_byte_count=GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT,
                description=member_name,
            )


def extract_release_archive_executable(
    archive_path: Path,
    executable_file_name: str,
    target_path: Path,
) -> None:
    """Extract one bounded regular executable file from a release archive."""
    try:
        if archive_path.name.endswith(".zip"):
            payload = _read_zip_release_archive_executable(
                archive_path,
                executable_file_name,
            )
        else:
            payload = _read_tar_gzip_release_archive_executable(
                archive_path,
                executable_file_name,
            )
    except SetupError:
        raise
    except (
        EOFError,
        OSError,
        RuntimeError,
        tarfile.TarError,
        zipfile.BadZipFile,
    ) as exc:
        raise SetupError(
            f"{archive_path.name} is not a valid GitHub MCP Server release archive."
        ) from exc

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(payload)
    target_path.chmod(target_path.stat().st_mode | 0o111)


def _parse_json_without_duplicate_object_members(
    serialized_document: str | bytes,
    *,
    description: str,
) -> object:
    """Parse standards-conforming JSON without object-member ambiguity."""

    def reject_duplicate_object_members(
        pairs: list[tuple[str, object]],
    ) -> dict[str, object]:
        parsed_object: dict[str, object] = {}

        for member_name, member_value in pairs:
            if member_name in parsed_object:
                raise SetupError(
                    f"{description} contains the duplicate JSON object member "
                    f"{member_name!r}."
                )

            parsed_object[member_name] = member_value

        return parsed_object

    def reject_non_standard_json_constant(constant_name: str) -> object:
        # Python deliberately accepts these JavaScript spellings by default,
        # even though RFC 8259 JSON does not. MCP hosts commonly use strict
        # parsers, so retaining one would publish a document they cannot read.
        raise SetupError(
            f"{description} contains the non-standard JSON constant "
            f"{constant_name!r}."
        )

    return json.loads(
        serialized_document,
        object_pairs_hook=reject_duplicate_object_members,
        parse_constant=reject_non_standard_json_constant,
    )


def merge_json_mcp_host_configuration(
    existing: str | None,
    name: str,
    entry: dict[str, object],
    *,
    remove_names: Iterable[str] = (),
) -> str:
    """
    Returns the text of an `mcpServers`-shaped configuration file with `name`
    pointing at the managed binary.

    The named server entry is replaced as one transport/authentication unit.
    Preserving fields from an earlier remote or PAT-backed entry could combine
    `url` with `command`, or forward a credential that silently disables OAuth.
    Other named servers and unrelated top-level keys survive unchanged because
    these files are shared with servers this repository does not own.
    """
    document: dict[str, object] = {}

    if existing and existing.strip():
        try:
            parsed = _parse_json_without_duplicate_object_members(
                existing,
                description="Existing MCP configuration",
            )
        except json.JSONDecodeError as exc:
            raise SetupError(
                f"Existing MCP configuration is not valid JSON: {exc}"
            ) from exc

        if not isinstance(parsed, dict):
            raise SetupError(
                "Existing MCP configuration is not a JSON object, so it cannot be "
                "merged. Move it aside and rerun."
            )

        document = parsed

    servers = document.setdefault("mcpServers", {})

    if not isinstance(servers, dict):
        raise SetupError(
            'Existing MCP configuration has a non-object "mcpServers" value, so it '
            "cannot be merged. Move it aside and rerun."
        )

    for obsolete_name in remove_names:
        servers.pop(obsolete_name, None)

    servers[name] = dict(entry)

    # `allow_nan=False` is the serialization-side counterpart to the strict
    # parser above and also catches a future non-finite managed value.
    return json.dumps(document, indent=2, allow_nan=False) + "\n"


def render_toml_literal(value: object) -> str:
    if isinstance(value, str):
        # TOML basic strings use JSON's escape rules for everything appearing in
        # a command path or an environment-variable name.
        return json.dumps(value)

    if isinstance(value, bool):
        return "true" if value else "false"

    if isinstance(value, int):
        return str(value)

    if isinstance(value, list):
        return "[" + ", ".join(render_toml_literal(item) for item in value) + "]"

    raise SetupError(f"Cannot render {value!r} as a TOML value.")


def codex_managed_mcp_server_marker(name: str, edge: str) -> str:
    """The marker line this script writes around the block it owns."""
    return (
        f"# {edge} mcp_servers.{name} - managed by "
        f"{MCP_HOST_CONFIGURATION_MANAGER}"
    )


def codex_managed_mcp_server_marker_pattern(
    name: str,
    edge: str,
) -> re.Pattern[str]:
    """
    Matches a marker line written by any version of this script.

    The attribution is matched loosely on purpose. It names the script that owns
    the block, so it changes whenever this file is renamed or moved — and a
    marker recognised only by its exact former text would leave the previous
    block unrecognised, which reads as a hand-written table and makes the merge
    refuse rather than update.
    """
    return re.compile(
        rf"^# {edge} mcp_servers\.{re.escape(name)} - managed by .*$",
        re.MULTILINE,
    )


def merge_codex_mcp_host_configuration(
    existing: str | None,
    name: str,
    entry: dict[str, object],
) -> str:
    """
    Returns the text of a Codex `config.toml` with a marker-delimited block for
    `name`.

    Codex configuration is hand-edited TOML carrying comments and ordering that a
    parse-and-rewrite round trip would flatten, so only the region between the
    markers is generated and everything outside it is copied through untouched.
    """
    block = "\n".join(
        [
            codex_managed_mcp_server_marker(name, "BEGIN"),
            f"[mcp_servers.{name}]",
            *(f"{key} = {render_toml_literal(value)}" for key, value in entry.items()),
            codex_managed_mcp_server_marker(name, "END"),
        ]
    )

    text = existing or ""

    begin = codex_managed_mcp_server_marker_pattern(name, "BEGIN").search(text)
    end = codex_managed_mcp_server_marker_pattern(name, "END").search(text)

    if begin and end and end.end() > begin.start():
        unmanaged_text = f"{text[:begin.start()]}{text[end.end():]}"

        if re.search(
            rf"^\s*\[mcp_servers\.{re.escape(name)}\.",
            unmanaged_text,
            re.MULTILINE,
        ):
            raise SetupError(
                "The Codex configuration declares a descendant table outside "
                f"the managed mcp_servers.{name} block. Move that setting into "
                "an independently named server or remove it before rerunning."
            )

        merged = f"{text[:begin.start()]}{block}{text[end.end():]}"
    else:
        # TOML forbids declaring `[mcp_servers.<name>]` twice, so appending a
        # managed block beside a hand-written one would invalidate the whole
        # Codex configuration rather than just this server.
        if re.search(
            rf"^\s*\[mcp_servers\.{re.escape(name)}(?:\]|\.)",
            text,
            re.MULTILINE,
        ):
            raise SetupError(
                "The Codex configuration already declares "
                f"[mcp_servers.{name}] or one of its descendant tables outside "
                "the block managed by this script. Remove that table and rerun "
                "so the managed block can own it, or rename your entry."
            )

        merged = f"{text.rstrip()}\n\n{block}\n" if text.strip() else f"{block}\n"

    if not merged.endswith("\n"):
        merged = f"{merged}\n"

    # `tomllib` is standard from Python 3.11, which this script already requires.
    # Importing it here rather than at module scope keeps the failure on an older
    # interpreter an actionable message instead of an ImportError raised before
    # `main` runs.
    try:
        import tomllib
    except ModuleNotFoundError as exc:  # pragma: no cover - guarded by the check
        raise SetupError(
            "Writing the Codex MCP configuration requires Python 3.11 or newer for "
            f"`tomllib`. Running: {sys.version.split()[0]}"
        ) from exc

    try:
        parsed = tomllib.loads(merged)
    except tomllib.TOMLDecodeError as exc:
        raise SetupError(
            f"The generated Codex configuration would not be valid TOML: {exc}"
        ) from exc

    servers = parsed.get("mcp_servers")
    written = servers.get(name) if isinstance(servers, dict) else None

    if written != entry:
        raise SetupError(
            f"The generated Codex configuration does not resolve [mcp_servers.{name}] "
            "to the complete managed entry. Inspect the file and rerun."
        )

    return merged


def remove_codex_mcp_server_table(existing: str, name: str) -> str:
    """Remove one explicitly obsolete Codex MCP server table subtree.

    TOML implicitly creates a parent table when a descendant such as
    `[mcp_servers.<name>.env]` survives. The migration must therefore remove the
    exact obsolete table and every descendant section, even when unrelated
    tables occur between them. Comments in removed sections remain available to
    adjacent retained tables, matching the previous migration behavior.
    Marker-managed blocks are removed as complete blocks so their ownership
    comments do not become misleading orphans.
    """
    begin = codex_managed_mcp_server_marker_pattern(name, "BEGIN").search(existing)
    end = codex_managed_mcp_server_marker_pattern(name, "END").search(existing)

    if begin or end:
        if not begin or not end or end.start() < begin.end():
            raise SetupError(
                f"The Codex configuration has an incomplete managed block for "
                f"mcp_servers.{name}. Repair the marker pair before rerunning."
            )

        prefix = existing[: begin.start()].rstrip()
        suffix = existing[end.end() :].lstrip("\r\n")
        existing = (
            f"{prefix}\n\n{suffix}" if prefix and suffix else f"{prefix}{suffix}"
        )

    # Codex writes these known legacy names as TOML bare keys. Enumerating every
    # section, rather than deleting one contiguous span, also removes a
    # descendant table that was reopened after an unrelated table.
    table_header_pattern = re.compile(
        r"(?m)^[ \t]*(?:"
        r"\[(?P<ordinary_table>[^\[\]\r\n]+)\]"
        r"|\[\[(?P<array_table>[^\[\]\r\n]+)\]\]"
        r")[ \t]*(?:#.*)?(?:\r?\n|$)"
    )
    table_headers = list(table_header_pattern.finditer(existing))
    obsolete_table_path = f"mcp_servers.{name}"
    obsolete_sections: list[tuple[int, int, str]] = []

    for index, table_header in enumerate(table_headers):
        ordinary_table_path = table_header.group("ordinary_table")

        if ordinary_table_path is None:
            # Array-of-tables headers are retained, but still delimit the end
            # of the preceding ordinary table. `tomllib` remains responsible
            # for validating both header forms after this conservative edit.
            continue

        declared_table_path = ordinary_table_path.strip()
        declared_table_is_obsolete = (
            declared_table_path == obsolete_table_path
            or declared_table_path.startswith(f"{obsolete_table_path}.")
        )

        if not declared_table_is_obsolete:
            continue

        section_end = (
            table_headers[index + 1].start()
            if index + 1 < len(table_headers)
            else len(existing)
        )
        removed_table_body = existing[table_header.end() : section_end]
        preserved_comment_lines = [
            line
            for line in removed_table_body.splitlines()
            if line.lstrip().startswith("#")
        ]
        obsolete_sections.append(
            (
                table_header.start(),
                section_end,
                "\n".join(preserved_comment_lines),
            )
        )

    if not obsolete_sections:
        return existing

    retained_segments: list[str] = []
    retained_cursor = 0

    for section_start, section_end, preserved_comments in obsolete_sections:
        retained_segments.append(existing[retained_cursor:section_start])

        if preserved_comments:
            retained_segments.append(f"{preserved_comments}\n")

        retained_cursor = section_end

    retained_segments.append(existing[retained_cursor:])
    return "".join(retained_segments)


def _require_legacy_codex_mcp_server_is_absent_after_source_migration(
    configuration_text: str,
    legacy_server_name: str,
) -> None:
    """Reject a semantic legacy key the conservative source edit did not own.

    `tomllib` owns TOML semantics, including quoted keys and whitespace around a
    dotted key. The source migration intentionally recognizes only the canonical
    table spelling that earlier versions of this repository generated. If the
    semantic key survives, failing closed preserves comments and formatting
    without growing a second, incomplete TOML parser in repository code.
    """
    try:
        import tomllib
    except ModuleNotFoundError as exc:  # pragma: no cover - guarded by main
        raise SetupError(
            "Migrating Codex MCP configuration requires Python 3.11 or newer for "
            f"`tomllib`. Running: {sys.version.split()[0]}"
        ) from exc

    try:
        parsed_configuration = tomllib.loads(configuration_text)
    except tomllib.TOMLDecodeError as exc:
        raise SetupError(
            f"Existing Codex configuration is not valid TOML: {exc}"
        ) from exc

    configured_servers = parsed_configuration.get("mcp_servers")

    if isinstance(configured_servers, dict) and legacy_server_name in configured_servers:
        raise SetupError(
            "The Codex configuration semantically declares legacy MCP server "
            f"{legacy_server_name!r} using TOML syntax this migration cannot "
            "safely rewrite while preserving unrelated formatting. Rewrite its "
            f"table header as [mcp_servers.{legacy_server_name}] or remove that "
            "legacy table, then rerun setup."
        )


def write_utf8_text_file(path: Path, contents: str) -> None:
    """Write normalized UTF-8 text, creating only the required parent path."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8", newline="\n")


def _repository_relative_setup_companion_script_path(
    companion_script_file_name: str,
) -> Path:
    """Locate a sibling script relative to the repository root contract."""
    if Path(companion_script_file_name).name != companion_script_file_name:
        raise ValueError("A setup companion script name cannot contain a path.")

    return Path(SETUP_SCRIPT_PATH.parent.name) / companion_script_file_name


def github_mcp_host_configuration_entry() -> dict[str, object]:
    """Return the complete portable host entry for the GitHub MCP Server."""
    return {
        "command": GITHUB_MCP_LAUNCHER_COMMAND,
        "args": [
            *REPOSITORY_ROOTED_NODE_ENTRY_POINT_ARGUMENT_PREFIX,
            _repository_relative_setup_companion_script_path(
                "launchGitHubMcpServer.js"
            ).as_posix(),
            "stdio",
        ],
    }


def universal_ontology_mcp_host_configuration_entry(
    *, codex: bool = False
) -> dict[str, object]:
    """Return the complete local stdio entry for the ontology application."""
    entry: dict[str, object] = {
        "command": UNIVERSAL_ONTOLOGY_MCP_LAUNCH_COMMAND,
        "args": list(UNIVERSAL_ONTOLOGY_MCP_LAUNCH_ARGUMENTS),
    }

    if codex:
        entry.update(
            {
                "startup_timeout_sec": (
                    UNIVERSAL_ONTOLOGY_MCP_STARTUP_TIMEOUT_SECONDS
                ),
                "tool_timeout_sec": UNIVERSAL_ONTOLOGY_MCP_TOOL_TIMEOUT_SECONDS,
                "required": True,
                "enabled_tools": list(
                    UNIVERSAL_ONTOLOGY_MCP_ENABLED_TOOL_NAMES
                ),
                "default_tools_approval_mode": "writes",
            }
        )

    return entry


def _read_optional_utf8_host_configuration_document(
    path: Path,
) -> tuple[str | None, bytes | None]:
    """Read one optional host document while retaining its exact source bytes."""
    try:
        observed_bytes = path.read_bytes()
    except FileNotFoundError:
        return None, None

    try:
        return observed_bytes.decode("utf-8"), observed_bytes
    except UnicodeDecodeError as exc:
        raise SetupError(
            f"Existing MCP host configuration is not valid UTF-8: {path}."
        ) from exc


def _render_mcp_host_configuration_documents(
    repo: Path,
    json_host_configurations: Iterable[tuple[Path, str]],
) -> list[RenderedMcpHostConfigurationDocument]:
    """Render every managed host document without changing the filesystem.

    Rendering all documents before publication is the transaction's validation
    phase: malformed JSON/TOML or an unmanaged ownership conflict aborts before
    even the first destination is created or replaced.
    """
    json_host_configuration_documents = list(json_host_configurations)
    ensure_mcp_host_configuration_destinations_are_safe(
        repo,
        [
            *(relative for relative, _host in json_host_configuration_documents),
            CODEX_MCP_HOST_CONFIGURATION_PATH,
        ],
    )
    rendered: list[RenderedMcpHostConfigurationDocument] = []

    for relative, _host in json_host_configuration_documents:
        path = repo / relative
        existing, observed_destination_bytes = (
            _read_optional_utf8_host_configuration_document(path)
        )
        contents = merge_json_mcp_host_configuration(
            existing,
            GITHUB_MCP_HOST_CONFIGURATION_NAME,
            github_mcp_host_configuration_entry(),
            remove_names=(LEGACY_GITHUB_MCP_HOST_CONFIGURATION_NAME,),
        )
        contents = merge_json_mcp_host_configuration(
            contents,
            UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME,
            universal_ontology_mcp_host_configuration_entry(),
            remove_names=(
                LEGACY_UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME,
            ),
        )
        rendered.append(
            RenderedMcpHostConfigurationDocument(
                destination_path=path,
                rendered_contents=contents,
                observed_destination_bytes=observed_destination_bytes,
            )
        )

    codex_path = repo / CODEX_MCP_HOST_CONFIGURATION_PATH
    codex_existing, codex_observed_destination_bytes = (
        _read_optional_utf8_host_configuration_document(codex_path)
    )
    codex_existing = codex_existing or ""
    codex_existing = remove_codex_mcp_server_table(
        codex_existing,
        LEGACY_GITHUB_MCP_HOST_CONFIGURATION_NAME,
    )
    _require_legacy_codex_mcp_server_is_absent_after_source_migration(
        codex_existing,
        LEGACY_GITHUB_MCP_HOST_CONFIGURATION_NAME,
    )
    codex_existing = remove_codex_mcp_server_table(
        codex_existing,
        LEGACY_UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME,
    )
    _require_legacy_codex_mcp_server_is_absent_after_source_migration(
        codex_existing,
        LEGACY_UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME,
    )
    codex_contents = merge_codex_mcp_host_configuration(
        codex_existing,
        GITHUB_MCP_HOST_CONFIGURATION_NAME,
        github_mcp_host_configuration_entry(),
    )
    codex_contents = merge_codex_mcp_host_configuration(
        codex_contents,
        UNIVERSAL_ONTOLOGY_MCP_HOST_CONFIGURATION_NAME,
        universal_ontology_mcp_host_configuration_entry(codex=True),
    )
    rendered.append(
        RenderedMcpHostConfigurationDocument(
            destination_path=codex_path,
            rendered_contents=codex_contents,
            observed_destination_bytes=codex_observed_destination_bytes,
        )
    )
    return rendered


def render_mcp_host_configuration_documents(
    repo: Path,
) -> list[RenderedMcpHostConfigurationDocument]:
    """Render checked-in and local host documents without writing either."""
    return _render_mcp_host_configuration_documents(
        repo,
        JSON_MCP_HOST_CONFIGURATION_DOCUMENTS,
    )


def _repository_local_mcp_transaction_file_prefix(path: Path) -> str:
    """Name a hidden sibling transaction artifact after its destination."""
    destination_file_name = path.name.lstrip(".")

    if not destination_file_name:
        raise SetupError(
            f"MCP setup cannot derive a transaction file name for: {path}."
        )

    return (
        f".{destination_file_name}."
        f"{REPOSITORY_LOCAL_MCP_TRANSACTION_FILE_NAME_COMPONENT}."
    )


def _require_repository_transaction_artifact_is_git_ignored(
    repository_root: Path,
    transaction_artifact_path: Path,
) -> None:
    """Require Git to ignore the exact transaction artifact before it gets data."""
    try:
        relative_transaction_artifact_path = transaction_artifact_path.resolve(
            strict=False
        ).relative_to(repository_root.resolve())
    except ValueError as exc:
        raise SetupError(
            "MCP transaction artifacts must remain inside the repository: "
            f"{transaction_artifact_path}."
        ) from exc

    relative_transaction_artifact_path_text = (
        relative_transaction_artifact_path.as_posix()
    )

    if not is_ignored(
        repository_root,
        relative_transaction_artifact_path_text,
    ):
        raise SetupError(
            "MCP transaction artifact is not ignored by Git: "
            f"{relative_transaction_artifact_path_text}. Add an exact ignore "
            "rule before staging credential-capable host configuration data."
        )


def _stage_host_configuration_document(
    repository_root: Path,
    path: Path,
    contents: str,
) -> Path:
    """Write and synchronize one Git-ignored replacement beside its destination."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            prefix=_repository_local_mcp_transaction_file_prefix(path),
            suffix=REPOSITORY_LOCAL_MCP_STAGED_FILE_SUFFIX,
            dir=path.parent,
            delete=False,
        ) as handle:
            temporary_path = Path(handle.name)
            # The file is still empty here. Validate the exact randomized path
            # before any merged host document (which may retain user secrets)
            # can reach a Git-visible transaction artifact.
            _require_repository_transaction_artifact_is_git_ignored(
                repository_root,
                temporary_path,
            )
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())

        return temporary_path
    except BaseException:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

        raise


def _create_activation_backup_copy(
    repository_root: Path,
    path: Path,
    *,
    require_git_ignore_coverage: bool,
) -> Path:
    """Create and synchronize a sibling rollback copy without moving `path`."""
    backup_path: Path | None = None

    try:
        source_permission_bits = stat.S_IMODE(path.stat().st_mode)

        with path.open("rb") as source, tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=_repository_local_mcp_transaction_file_prefix(path),
            suffix=REPOSITORY_LOCAL_MCP_ACTIVATION_BACKUP_FILE_SUFFIX,
            dir=path.parent,
            delete=False,
        ) as backup:
            backup_path = Path(backup.name)

            if require_git_ignore_coverage:
                # Validate the exact empty artifact before copying a host
                # document that may contain credentials retained by the merge.
                _require_repository_transaction_artifact_is_git_ignored(
                    repository_root,
                    backup_path,
                )

            shutil.copyfileobj(source, backup)
            backup.flush()
            os.fsync(backup.fileno())

        backup_path.chmod(source_permission_bits)
        return backup_path
    except BaseException:
        if backup_path is not None:
            backup_path.unlink(missing_ok=True)

        raise


def _create_empty_activation_displaced_file_path(
    repository_root: Path,
    path: Path,
    *,
    require_git_ignore_coverage: bool,
) -> Path:
    """Reserve the sibling path that will receive an atomically displaced file.

    The path starts as an empty regular file. On Windows, `ReplaceFileW` writes
    the replaced file to it; on Linux and macOS, the staged file is moved to
    this name before the kernel exchanges it with the live destination.
    """
    displaced_file_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=_repository_local_mcp_transaction_file_prefix(path),
            suffix=REPOSITORY_LOCAL_MCP_ACTIVATION_BACKUP_FILE_SUFFIX,
            dir=path.parent,
            delete=False,
        ) as displaced_file:
            displaced_file_path = Path(displaced_file.name)

            if require_git_ignore_coverage:
                # Validate the still-empty randomized path before it can
                # receive a complete host document with retained credentials.
                _require_repository_transaction_artifact_is_git_ignored(
                    repository_root,
                    displaced_file_path,
                )

            displaced_file.flush()
            os.fsync(displaced_file.fileno())

        return displaced_file_path
    except BaseException:
        if displaced_file_path is not None:
            displaced_file_path.unlink(missing_ok=True)

        raise


def _exchange_existing_file_paths(
    first_path: Path,
    second_path: Path,
    *,
    operating_system_name: str,
) -> None:
    """Ask the host kernel to atomically exchange two existing file names."""
    import ctypes

    first_path_bytes = os.fsencode(first_path.resolve())
    second_path_bytes = os.fsencode(second_path.resolve())
    system_library = ctypes.CDLL(None, use_errno=True)

    if operating_system_name == "Linux":
        try:
            rename_at_2 = system_library.renameat2
        except AttributeError as exc:
            raise SetupError(
                "This Linux runtime does not expose renameat2, which is required "
                "to preserve a concurrently edited MCP host configuration."
            ) from exc

        rename_at_2.argtypes = [
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_uint,
        ]
        rename_at_2.restype = ctypes.c_int
        result = rename_at_2(
            LINUX_AT_FDCWD,
            first_path_bytes,
            LINUX_AT_FDCWD,
            second_path_bytes,
            LINUX_RENAME_EXCHANGE,
        )
    elif operating_system_name == "Darwin":
        try:
            rename_extended = system_library.renamex_np
        except AttributeError as exc:
            raise SetupError(
                "This macOS runtime does not expose renamex_np, which is required "
                "to preserve a concurrently edited MCP host configuration."
            ) from exc

        rename_extended.argtypes = [
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_uint,
        ]
        rename_extended.restype = ctypes.c_int
        result = rename_extended(
            first_path_bytes,
            second_path_bytes,
            DARWIN_RENAME_SWAP,
        )
    else:
        raise SetupError(
            "Atomic MCP host-configuration replacement is supported only on "
            f"Windows, Linux, and macOS; reported operating system: "
            f"{operating_system_name or '(empty)'}."
        )

    if result != 0:
        error_number = ctypes.get_errno()
        raise OSError(
            error_number,
            os.strerror(error_number),
            f"{first_path} <-> {second_path}",
        )


def _replace_existing_file_and_retain_displaced_file(
    destination_path: Path,
    staged_replacement_path: Path,
    displaced_file_path: Path,
) -> None:
    """Atomically publish a file while retaining the exact displaced live file.

    All paths are siblings, so every native operation remains on one volume.
    The caller validates `displaced_file_path` before it commits the wider
    transaction; this is the compare step that an unconditional `os.replace`
    cannot provide.
    """
    operating_system_name = platform.system()

    if operating_system_name == "Windows":
        import ctypes

        replace_file = ctypes.WinDLL("kernel32", use_last_error=True).ReplaceFileW
        replace_file.argtypes = [
            ctypes.c_wchar_p,
            ctypes.c_wchar_p,
            ctypes.c_wchar_p,
            ctypes.c_uint32,
            ctypes.c_void_p,
            ctypes.c_void_p,
        ]
        replace_file.restype = ctypes.c_int
        replacement_succeeded = replace_file(
            str(destination_path.resolve()),
            str(staged_replacement_path.resolve()),
            str(displaced_file_path.resolve()),
            WINDOWS_REPLACE_FILE_WITH_DEFAULT_FLAGS,
            None,
            None,
        )

        if not replacement_succeeded:
            raise ctypes.WinError(ctypes.get_last_error())

        return

    if operating_system_name not in {"Linux", "Darwin"}:
        raise SetupError(
            "Atomic MCP host-configuration replacement is supported only on "
            f"Windows, Linux, and macOS; reported operating system: "
            f"{operating_system_name or '(empty)'}."
        )

    # Put the staged bytes at the stable rollback name before the exchange.
    # This move affects no live path. After the single kernel operation,
    # `destination_path` names the replacement and `displaced_file_path` names
    # the exact file that occupied the destination at that instant.
    os.replace(staged_replacement_path, displaced_file_path)
    _exchange_existing_file_paths(
        displaced_file_path,
        destination_path,
        operating_system_name=operating_system_name,
    )


def _stage_file_for_atomic_replacement(source_path: Path, destination: Path) -> Path:
    """Copy one staged payload beside its destination and synchronize it."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None

    try:
        with source_path.open("rb") as source, tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=_repository_local_mcp_transaction_file_prefix(destination),
            suffix=REPOSITORY_LOCAL_MCP_STAGED_FILE_SUFFIX,
            dir=destination.parent,
            delete=False,
        ) as target:
            temporary_path = Path(target.name)
            shutil.copyfileobj(source, target)
            target.flush()
            os.fsync(target.fileno())

        temporary_path.chmod(source_path.stat().st_mode)
        return temporary_path
    except BaseException:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

        raise


def _files_have_identical_bytes(left: Path, right: Path) -> bool:
    if left.stat().st_size != right.stat().st_size:
        return False

    with left.open("rb") as left_handle, right.open("rb") as right_handle:
        while True:
            left_chunk = left_handle.read(1024 * 1024)
            right_chunk = right_handle.read(1024 * 1024)

            if left_chunk != right_chunk:
                return False

            if not left_chunk:
                return True


def _files_have_identical_execution_permission_bits(
    left: Path,
    right: Path,
) -> bool:
    """Compare POSIX execution bits; other staged-file metadata is incidental."""
    return (
        left.stat().st_mode & POSIX_FILE_EXECUTION_PERMISSION_MASK
    ) == (right.stat().st_mode & POSIX_FILE_EXECUTION_PERMISSION_MASK)


def _read_optional_file_bytes(path: Path) -> bytes | None:
    """Return exact bytes, using `None` exclusively for an absent path."""
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def _read_optional_regular_file_content_and_permission_state(
    path: Path,
) -> RegularFileContentAndPermissionState | None:
    """Read rollback-guard state without treating a special path as a file."""
    try:
        path_status = path.lstat()
    except FileNotFoundError:
        return None

    if _path_is_symbolic_link_or_junction(path) or not stat.S_ISREG(
        path_status.st_mode
    ):
        raise OSError(f"Rollback destination is not a regular file: {path}.")

    return RegularFileContentAndPermissionState(
        byte_length=path_status.st_size,
        content_sha256=calculate_file_sha256(path),
        file_permission_bits=stat.S_IMODE(path_status.st_mode),
    )


def _require_expected_destination_bytes(
    destination: Path,
    expected_destination_bytes: bytes | None,
) -> None:
    """Reject an edit made after a host configuration was rendered."""
    if _read_optional_file_bytes(destination) != expected_destination_bytes:
        raise SetupError(
            "MCP host configuration changed after it was rendered: "
            f"{destination}. No setup files were activated; rerun setup to "
            "merge the current document."
        )


def _activate_staged_file_replacements(
    repository_root: Path,
    replacements: Iterable[tuple[Path, Path]],
    *,
    expected_destination_bytes_by_path: dict[Path, bytes | None] | None = None,
    sensitive_host_configuration_destination_paths: Iterable[Path] = (),
) -> list[Path]:
    """Replace live paths continuously as one rollback-capable transaction."""
    replacement_list = list(replacements)
    guarded_destination_bytes_by_path = dict(
        expected_destination_bytes_by_path or {}
    )
    sensitive_host_configuration_destination_path_set = set(
        sensitive_host_configuration_destination_paths
    )
    prepared_file_replacements: list[
        tuple[
            Path,
            Path,
            Path | None,
            RegularFileContentAndPermissionState,
        ]
    ] = []
    activated_file_replacements: list[ActivatedFileReplacement] = []
    replacement_destination_paths: list[Path] = []
    preserved_recovery_backup_paths: set[Path] = set()
    retained_superseded_backups: list[tuple[Path, OSError]] = []
    rollback_conflict_destination_paths: list[Path] = []
    normalized_destination_path_keys: set[str] = set()

    try:
        for destination, temporary_path in replacement_list:
            normalized_destination = os.path.normcase(
                os.path.abspath(destination)
            )

            if normalized_destination in normalized_destination_path_keys:
                raise SetupError(
                    "The MCP setup transaction contains a duplicate replacement "
                    f"destination: {destination}."
                )

            normalized_destination_path_keys.add(normalized_destination)
            replacement_destination_paths.append(destination)

            if destination in guarded_destination_bytes_by_path:
                _require_expected_destination_bytes(
                    destination,
                    guarded_destination_bytes_by_path[destination],
                )

            if (
                destination.exists()
                and _files_have_identical_bytes(destination, temporary_path)
                and _files_have_identical_execution_permission_bits(
                    destination,
                    temporary_path,
                )
            ):
                continue

            published_destination_state = (
                _read_optional_regular_file_content_and_permission_state(
                    temporary_path
                )
            )

            if published_destination_state is None:
                raise SetupError(
                    "The staged MCP replacement disappeared before activation: "
                    f"{temporary_path}."
                )

            backup_path: Path | None = None

            if destination.exists():
                require_git_ignore_coverage = (
                    destination
                    in sensitive_host_configuration_destination_path_set
                )
                backup_path = (
                    _create_empty_activation_displaced_file_path(
                        repository_root,
                        destination,
                        require_git_ignore_coverage=(
                            require_git_ignore_coverage
                        ),
                    )
                    if destination in guarded_destination_bytes_by_path
                    else _create_activation_backup_copy(
                        repository_root,
                        destination,
                        require_git_ignore_coverage=(
                            require_git_ignore_coverage
                        ),
                    )
                )
            prepared_file_replacements.append(
                (
                    destination,
                    temporary_path,
                    backup_path,
                    published_destination_state,
                )
            )

        unmatched_guarded_destination_paths = set(
            guarded_destination_bytes_by_path
        ).difference(replacement_destination_paths)

        if unmatched_guarded_destination_paths:
            listing = ", ".join(
                str(path)
                for path in sorted(unmatched_guarded_destination_paths)
            )
            raise SetupError(
                "MCP setup received observed bytes for a destination that is not "
                f"part of the activation transaction: {listing}."
            )

        unmatched_sensitive_host_configuration_destination_paths = (
            sensitive_host_configuration_destination_path_set.difference(
                replacement_destination_paths
            )
        )

        if unmatched_sensitive_host_configuration_destination_paths:
            listing = ", ".join(
                str(path)
                for path in sorted(
                    unmatched_sensitive_host_configuration_destination_paths
                )
            )
            raise SetupError(
                "MCP setup received a sensitive host-configuration destination "
                f"that is not part of the activation transaction: {listing}."
            )

        # Backup copies can take appreciable time for native programs. Recheck
        # every guarded configuration after preparation and immediately before
        # the first live path is replaced.
        for destination, expected_destination_bytes in (
            guarded_destination_bytes_by_path.items()
        ):
            _require_expected_destination_bytes(
                destination,
                expected_destination_bytes,
            )

        for (
            destination,
            temporary_path,
            backup_path,
            published_destination_state,
        ) in prepared_file_replacements:
            if destination in guarded_destination_bytes_by_path:
                # Program and record replacements may precede a host document.
                # Close that remaining interval by checking the document again
                # at its own replacement boundary.
                _require_expected_destination_bytes(
                    destination,
                    guarded_destination_bytes_by_path[destination],
                )

            if destination in guarded_destination_bytes_by_path:
                expected_destination_bytes = (
                    guarded_destination_bytes_by_path[destination]
                )

                if expected_destination_bytes is None:
                    try:
                        # A hard link publishes this same-directory regular file
                        # only if the still-absent destination name can be created
                        # atomically. It never overwrites a file created after the
                        # render-time observation.
                        os.link(temporary_path, destination)
                    except FileExistsError as link_error:
                        raise SetupError(
                            "MCP host configuration changed after it was rendered: "
                            f"{destination}. The concurrently created file was "
                            "preserved; rerun setup to merge it."
                        ) from link_error

                    activated_file_replacements.append(
                        ActivatedFileReplacement(
                            destination_path=destination,
                            rollback_backup_path=None,
                            published_destination_state=(
                                published_destination_state
                            ),
                        )
                    )
                    temporary_path.unlink()
                    continue

                if backup_path is None:
                    raise SetupError(
                        "The guarded MCP host configuration has no displaced-file "
                        f"path: {destination}."
                    )

                _replace_existing_file_and_retain_displaced_file(
                    destination,
                    temporary_path,
                    backup_path,
                )
                activated_file_replacements.append(
                    ActivatedFileReplacement(
                        destination_path=destination,
                        rollback_backup_path=backup_path,
                        published_destination_state=published_destination_state,
                    )
                )

                # Unlike a pre-operation copy, this path contains the exact file
                # displaced by the native replacement. A mismatch therefore
                # detects even an edit made after the final precheck but before
                # the kernel operation. The ordinary rollback path below restores
                # those bytes while the published destination is still ours.
                if backup_path.read_bytes() != expected_destination_bytes:
                    raise SetupError(
                        "The MCP host configuration atomically displaced during "
                        "activation differs from the document that was rendered: "
                        f"{destination}. The displaced bytes will be restored; "
                        "rerun setup to merge the current document."
                    )

                continue

            # Generated programs and records are protected by the repository-
            # scoped setup lock rather than an external host editor. Their
            # synchronized backup copy supports the wider transaction rollback;
            # replace-over-destination keeps the live path continuously present.
            os.replace(temporary_path, destination)
            activated_file_replacements.append(
                ActivatedFileReplacement(
                    destination_path=destination,
                    rollback_backup_path=backup_path,
                    published_destination_state=published_destination_state,
                )
            )

    except BaseException as exc:
        rollback_failures: list[str] = []

        for activated_replacement in reversed(activated_file_replacements):
            destination = activated_replacement.destination_path
            backup_path = activated_replacement.rollback_backup_path
            current_destination_state: (
                RegularFileContentAndPermissionState | None
            ) = None

            try:
                current_destination_state = (
                    _read_optional_regular_file_content_and_permission_state(
                        destination
                    )
                )

                if (
                    current_destination_state
                    != activated_replacement.published_destination_state
                ):
                    rollback_conflict_destination_paths.append(destination)

                    if backup_path is not None and backup_path.exists():
                        preserved_recovery_backup_paths.add(backup_path)

                    continue

                if backup_path is not None and backup_path.exists():
                    os.replace(backup_path, destination)
                else:
                    destination.unlink(missing_ok=True)
            except OSError as rollback_error:
                # A destination that can no longer be read as the exact regular
                # file we published is itself a concurrent-state conflict. Do
                # not overwrite or unlink it during an error-recovery path.
                if current_destination_state is None:
                    rollback_conflict_destination_paths.append(destination)
                else:
                    rollback_failures.append(
                        f"{destination}: {rollback_error}"
                    )

                if backup_path is not None and backup_path.exists():
                    preserved_recovery_backup_paths.add(backup_path)

        rollback_detail = (
            " Rollback also failed for: " + "; ".join(rollback_failures) + "."
            if rollback_failures
            else ""
        )
        recovery_detail = (
            " The preserved recovery backup"
            + (
                "s are: "
                if len(preserved_recovery_backup_paths) != 1
                else " is: "
            )
            + ", ".join(
                str(path) for path in sorted(preserved_recovery_backup_paths)
            )
            + "."
            if preserved_recovery_backup_paths
            else ""
        )
        rollback_conflict_detail = (
            " Rollback preserved concurrent destination changes at: "
            + ", ".join(
                str(path)
                for path in rollback_conflict_destination_paths
            )
            + "."
            if rollback_conflict_destination_paths
            else ""
        )

        if (
            not isinstance(exc, Exception)
            and not rollback_failures
            and not rollback_conflict_destination_paths
        ):
            raise

        raise SetupError(
            f"Could not activate the staged MCP setup transaction: {exc}."
            f"{rollback_detail}{rollback_conflict_detail}{recovery_detail}"
        ) from exc

    finally:
        for _destination, temporary_path in replacement_list:
            temporary_path.unlink(missing_ok=True)

        for (
            _destination,
            _temporary_path,
            backup_path,
            _published_destination_state,
        ) in prepared_file_replacements:
            if (
                backup_path is not None
                and backup_path not in preserved_recovery_backup_paths
            ):
                try:
                    backup_path.unlink(missing_ok=True)
                except OSError as cleanup_error:
                    # Activation has already committed. A scanner, backup agent,
                    # or other process can transiently retain the inactive copy;
                    # deferred cleanup must not turn that success into failure.
                    retained_superseded_backups.append((backup_path, cleanup_error))

        if retained_superseded_backups:
            print(
                "Warning: retained superseded backup file(s) because the "
                "operating system denied cleanup. Restart processes that may "
                "still use them, then delete these inactive paths:",
                file=sys.stderr,
            )

            for backup_path, cleanup_error in retained_superseded_backups:
                print(
                    f"  {backup_path} ({cleanup_error})",
                    file=sys.stderr,
                )

    return replacement_destination_paths


def publish_mcp_host_configuration_documents(
    repository_root: Path,
    rendered_documents: Iterable[RenderedMcpHostConfigurationDocument],
) -> list[Path]:
    """Publish host documents with per-file atomicity and transaction rollback."""
    documents = list(rendered_documents)
    replacements: list[tuple[Path, Path]] = []

    try:
        for document in documents:
            replacements.append(
                (
                    document.destination_path,
                    _stage_host_configuration_document(
                        repository_root,
                        document.destination_path,
                        document.rendered_contents,
                    ),
                )
            )
    except BaseException as exc:
        for _destination, temporary_path in replacements:
            temporary_path.unlink(missing_ok=True)

        if not isinstance(exc, Exception):
            raise

        raise SetupError(
            f"Could not stage MCP host configuration documents: {exc}."
        ) from exc

    return _activate_staged_file_replacements(
        repository_root,
        replacements,
        expected_destination_bytes_by_path={
            document.destination_path: document.observed_destination_bytes
            for document in documents
        },
        sensitive_host_configuration_destination_paths={
            document.destination_path for document in documents
        },
    )


def activate_staged_mcp_server_installations_and_host_configurations(
    repository_root: Path,
    staged_installations: Iterable[StagedMcpServerInstallation],
    rendered_documents: Iterable[RenderedMcpHostConfigurationDocument],
) -> list[Path]:
    """Activate server software, records, and host documents as one unit."""
    documents = list(rendered_documents)
    replacements: list[tuple[Path, Path]] = []

    try:
        for installation in staged_installations:
            replacements.extend(
                [
                    (
                        installation.installed_program_path,
                        _stage_file_for_atomic_replacement(
                            installation.staged_program_path,
                            installation.installed_program_path,
                        ),
                    ),
                    (
                        installation.installed_installation_record_path,
                        _stage_file_for_atomic_replacement(
                            installation.staged_installation_record_path,
                            installation.installed_installation_record_path,
                        ),
                    ),
                ]
            )

        for document in documents:
            replacements.append(
                (
                    document.destination_path,
                    _stage_host_configuration_document(
                        repository_root,
                        document.destination_path,
                        document.rendered_contents,
                    ),
                )
            )
    except BaseException as exc:
        for _destination, temporary_path in replacements:
            temporary_path.unlink(missing_ok=True)

        if not isinstance(exc, Exception):
            raise

        raise SetupError(
            "Could not stage the MCP server installation transaction: "
            f"{exc}."
        ) from exc

    return _activate_staged_file_replacements(
        repository_root,
        replacements,
        expected_destination_bytes_by_path={
            document.destination_path: document.observed_destination_bytes
            for document in documents
        },
        sensitive_host_configuration_destination_paths={
            document.destination_path for document in documents
        },
    )


def write_mcp_host_configuration_documents(repo: Path) -> list[Path]:
    """Render and transactionally publish every validated host document."""
    rendered = render_mcp_host_configuration_documents(repo)
    return publish_mcp_host_configuration_documents(repo, rendered)


def check_mcp_host_configuration_documents(repo: Path) -> list[Path]:
    """Fail read-only when a checked-in host document differs from its render."""
    # Antigravity's local document can contain credentials or user-specific
    # servers. Read-only checked-in drift validation must neither parse nor
    # diagnose that explicitly local file.
    rendered = _render_mcp_host_configuration_documents(
        repo,
        CHECKED_IN_JSON_MCP_HOST_CONFIGURATION_DOCUMENTS,
    )
    checked_relatives = {
        relative
        for relative, _host in CHECKED_IN_JSON_MCP_HOST_CONFIGURATION_DOCUMENTS
    }
    checked_relatives.add(CODEX_MCP_HOST_CONFIGURATION_PATH)
    stale: list[str] = []
    checked_paths: list[Path] = []

    for document in rendered:
        path = document.destination_path
        relative = path.relative_to(repo)

        if relative not in checked_relatives:
            continue

        checked_paths.append(path)
        expected = document.rendered_contents.encode("utf-8")

        if not path.exists():
            stale.append(f"missing: {relative.as_posix()}")
        elif path.read_bytes() != expected:
            stale.append(f"stale: {relative.as_posix()}")

    if stale:
        raise SetupError(
            "MCP host configuration check failed:\n  - " + "\n  - ".join(stale)
        )

    return checked_paths


def fetch_url_bytes(
    url: str,
    *,
    maximum_response_byte_count: int,
    accept: str | None = None,
) -> bytes:
    """Fetch a response body without trusting Content-Length for its bound."""
    if (
        isinstance(maximum_response_byte_count, bool)
        or not isinstance(maximum_response_byte_count, int)
        or maximum_response_byte_count < 0
    ):
        raise ValueError("maximum_response_byte_count must be a non-negative integer.")

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                f"{MCP_HOST_CONFIGURATION_MANAGER} (+repository bootstrap)"
            )
        },
    )

    if accept:
        request.add_header("Accept", accept)

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            declared_byte_count_text = response.headers.get("Content-Length")

            if declared_byte_count_text is not None:
                try:
                    declared_byte_count = int(declared_byte_count_text)
                except ValueError:
                    declared_byte_count = None

                if (
                    declared_byte_count is not None
                    and declared_byte_count > maximum_response_byte_count
                ):
                    raise SetupError(
                        f"Response from {url} declares {declared_byte_count} bytes; "
                        f"the maximum is {maximum_response_byte_count} bytes."
                    )

            payload = bytearray()

            while len(payload) <= maximum_response_byte_count:
                remaining_byte_count = (
                    maximum_response_byte_count - len(payload) + 1
                )
                chunk = response.read(
                    min(
                        HTTP_RESPONSE_READ_CHUNK_BYTE_COUNT,
                        remaining_byte_count,
                    )
                )

                if not chunk:
                    return bytes(payload)

                payload.extend(chunk)

            raise SetupError(
                f"Response from {url} exceeded the maximum response size of "
                f"{maximum_response_byte_count} bytes."
            )
    except urllib.error.HTTPError as exc:
        detail = (
            " The unauthenticated GitHub API allows 60 requests an hour per address."
            if exc.code in (403, 429)
            else ""
        )
        raise SetupError(
            f"HTTP {exc.code} fetching {url}: {exc.reason}.{detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise SetupError(f"Could not fetch {url}: {exc.reason}") from exc


def resolve_latest_github_mcp_release() -> tuple[str, dict[str, str]]:
    """Returns the latest release's tag and its asset-name-to-URL mapping."""
    release_metadata_bytes = fetch_url_bytes(
        GITHUB_MCP_RELEASES_API,
        accept="application/vnd.github+json",
        maximum_response_byte_count=(
            GITHUB_RELEASE_METADATA_MAXIMUM_BYTE_COUNT
        ),
    )

    try:
        release_metadata = _parse_json_without_duplicate_object_members(
            release_metadata_bytes,
            description="Latest GitHub MCP Server release metadata",
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SetupError(
            "The latest GitHub MCP Server release metadata is not valid JSON."
        ) from exc

    if not isinstance(release_metadata, dict):
        raise SetupError(
            "The latest GitHub MCP Server release metadata must be a JSON object."
        )

    release_tag = release_metadata.get("tag_name")

    if not isinstance(release_tag, str) or not release_tag:
        raise SetupError(
            f"The latest GitHub MCP server release reports no tag. See "
            f"{GITHUB_MCP_RELEASES_PAGE}"
        )

    release_asset_metadata = release_metadata.get("assets")

    if not isinstance(release_asset_metadata, list):
        raise SetupError(
            f"The latest GitHub MCP server release ({release_tag}) reports no "
            f"asset list. See {GITHUB_MCP_RELEASES_PAGE}"
        )

    release_assets: dict[str, str] = {}

    for asset_metadata in release_asset_metadata:
        if not isinstance(asset_metadata, dict):
            continue

        asset_name = asset_metadata.get("name")
        asset_url = asset_metadata.get("browser_download_url")

        if not isinstance(asset_name, str) or not isinstance(asset_url, str):
            continue

        if asset_name in release_assets:
            raise SetupError(
                f"Release {release_tag} reports the duplicate asset name "
                f"{asset_name}."
            )

        release_assets[asset_name] = asset_url

    if not release_assets:
        raise SetupError(
            f"The latest GitHub MCP server release ({release_tag}) publishes no "
            f"assets. See {GITHUB_MCP_RELEASES_PAGE}"
        )

    return release_tag, release_assets


def download_verified_github_mcp_release_archive(
    release_tag: str,
    release_assets: dict[str, str],
    release_archive_asset_name: str,
) -> bytes:
    """
    Downloads a release asset and checks it against the release's own checksum
    manifest before anything is written into the repository.
    """
    if release_archive_asset_name not in release_assets:
        available = ", ".join(sorted(release_assets))
        raise SetupError(
            f"Release {release_tag} does not publish "
            f"{release_archive_asset_name}. It publishes: {available}."
        )

    manifests = [
        name for name in release_assets if name.endswith("checksums.txt")
    ]

    if len(manifests) != 1:
        raise SetupError(
            f"Release {release_tag} must publish exactly one checksum manifest; "
            f"found {len(manifests)}. The archive cannot be verified before "
            "installation."
        )

    checksum_manifest_bytes = fetch_url_bytes(
        release_assets[manifests[0]],
        maximum_response_byte_count=(
            GITHUB_RELEASE_CHECKSUM_MANIFEST_MAXIMUM_BYTE_COUNT
        ),
    )

    try:
        checksum_manifest_text = checksum_manifest_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise SetupError(
            f"{manifests[0]} in release {release_tag} is not valid UTF-8."
        ) from exc

    checksums = parse_sha256_checksum_manifest(checksum_manifest_text)
    expected = checksums.get(release_archive_asset_name)

    if expected is None:
        raise SetupError(
            f"{manifests[0]} in release {release_tag} lists no digest for "
            f"{release_archive_asset_name}."
        )

    print(f"  Downloading {release_archive_asset_name}")
    payload = fetch_url_bytes(
        release_assets[release_archive_asset_name],
        maximum_response_byte_count=GITHUB_MCP_RELEASE_ARCHIVE_MAXIMUM_BYTE_COUNT,
    )
    actual = hashlib.sha256(payload).hexdigest()

    if actual != expected:
        raise SetupError(
            f"Checksum mismatch for {release_archive_asset_name} in release "
            f"{release_tag}.\n"
            f"Expected: {expected}\n"
            f"Actual:   {actual}"
        )

    return payload


def calculate_file_sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def _read_json_object(path: Path, description: str) -> dict[str, object]:
    try:
        value = _parse_json_without_duplicate_object_members(
            path.read_text(encoding="utf-8"),
            description=description.capitalize(),
        )
    except FileNotFoundError as exc:
        raise SetupError(f"Missing {description}: {path}") from exc
    except UnicodeDecodeError as exc:
        raise SetupError(f"Invalid UTF-8 in {description} {path}.") from exc
    except json.JSONDecodeError as exc:
        raise SetupError(f"Invalid JSON in {description} {path}: {exc}") from exc

    if not isinstance(value, dict):
        raise SetupError(f"{description.capitalize()} must be a JSON object: {path}")

    return value


def _read_declared_npm_version(repo: Path) -> str:
    root_package = _read_json_object(repo / "package.json", "root package manifest")
    package_manager = root_package.get("packageManager")
    match = (
        re.fullmatch(r"npm@(\d+\.\d+\.\d+)", package_manager)
        if isinstance(package_manager, str)
        else None
    )

    if match is None:
        raise SetupError(
            'The root package manifest must declare an exact "packageManager" '
            "value in npm@<major>.<minor>.<patch> form."
        )

    return match.group(1)


def read_universal_ontology_mcp_package_identity(
    repo: Path,
) -> tuple[str, str]:
    """Read the canonical MCP package name and declared software version."""
    package_manifest_path = (
        repo / UNIVERSAL_ONTOLOGY_MCP_PACKAGE_MANIFEST_RELATIVE_PATH
    )
    package_manifest = _read_json_object(
        package_manifest_path,
        "Universal Ontology MCP package manifest",
    )
    package_name = package_manifest.get("name")
    package_version = package_manifest.get("version")

    if package_name != UNIVERSAL_ONTOLOGY_MCP_PACKAGE_NAME:
        raise SetupError(
            "The Universal Ontology MCP package name must be "
            f"{UNIVERSAL_ONTOLOGY_MCP_PACKAGE_NAME!r}; reported "
            f"{package_name!r}."
        )

    if not isinstance(package_version, str) or not package_version.strip():
        raise SetupError(
            "The Universal Ontology MCP package manifest must declare a "
            "non-empty software version."
        )

    return package_name, package_version


def _validate_node_runtime(node_command: str) -> None:
    result = run([node_command, "--version"], capture=True)
    match = re.fullmatch(r"v(\d+)\.\d+\.\d+", result.stdout.strip())

    if match is None or int(match.group(1)) < MINIMUM_NODE_MAJOR_VERSION:
        reported = result.stdout.strip() or "(no version reported)"
        raise SetupError(
            "Building the Universal Ontology MCP application bundle requires "
            f"Node.js {MINIMUM_NODE_MAJOR_VERSION} or later. Reported: {reported}"
        )


def build_universal_ontology_mcp_application_bundle(
    repo: Path,
) -> BuiltUniversalOntologyMcpApplicationBundle:
    """Build and validate the canonical data-free MCP application bundle."""
    node_command = require_command("node")
    npx_command = require_command("npx")
    npm_version = _read_declared_npm_version(repo)
    declared_package_name, declared_package_version = (
        read_universal_ontology_mcp_package_identity(repo)
    )
    selected_npm = f"npm@{npm_version}"
    _validate_node_runtime(node_command)
    npm_version_result = run(
        [npx_command, "--yes", selected_npm, "--version"],
        capture=True,
    )

    if npm_version_result.stdout.strip() != npm_version:
        raise SetupError(
            f"Expected npm {npm_version}; npx reported "
            f"{npm_version_result.stdout.strip() or '(no version)'}."
        )

    # Lifecycle scripts are unnecessary for this locked dependency graph and
    # expand the bootstrap trust surface, so the clean install disables them.
    run(
        [npx_command, "--yes", selected_npm, "ci", "--ignore-scripts"],
        cwd=repo,
    )
    run(
        [npx_command, "--yes", selected_npm, "run", "mcp:package:build"],
        cwd=repo,
    )

    application_bundle_path = (
        repo / UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_RELATIVE_PATH
    )
    metadata_path = (
        repo / UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_METADATA_RELATIVE_PATH
    )
    metadata = _read_json_object(metadata_path, "application-bundle metadata")
    expected_relative_path = (
        UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_RELATIVE_PATH.as_posix()
    )
    required_values = {
        "applicationBundleMetadataFormatVersion": (
            UNIVERSAL_ONTOLOGY_MCP_APPLICATION_BUNDLE_METADATA_FORMAT_VERSION
        ),
        "bundleRelativePath": expected_relative_path,
    }

    for field_name, expected_value in required_values.items():
        if metadata.get(field_name) != expected_value:
            raise SetupError(
                f"Application-bundle metadata field {field_name!r} must be "
                f"{expected_value!r}."
            )

    if not application_bundle_path.is_file():
        raise SetupError(
            f"Canonical MCP application bundle is missing: {application_bundle_path}"
        )

    bundle_byte_length = application_bundle_path.stat().st_size
    bundle_sha256 = calculate_file_sha256(application_bundle_path)
    package_name = metadata.get("packageName")
    package_version = metadata.get("packageVersion")

    if metadata.get("bundleByteLength") != bundle_byte_length:
        raise SetupError(
            "Application-bundle byte length disagrees with its metadata."
        )

    if metadata.get("bundleSha256") != bundle_sha256:
        raise SetupError("Application-bundle SHA-256 disagrees with its metadata.")

    if package_name != declared_package_name:
        raise SetupError(
            "Application-bundle metadata packageName disagrees with the "
            f"declared package identity {declared_package_name!r}."
        )

    if package_version != declared_package_version:
        raise SetupError(
            "Application-bundle metadata packageVersion disagrees with the "
            f"declared software version {declared_package_version!r}."
        )

    return BuiltUniversalOntologyMcpApplicationBundle(
        application_bundle_path=application_bundle_path,
        application_bundle_byte_length=bundle_byte_length,
        application_bundle_sha256=bundle_sha256,
        package_name=package_name,
        package_version=package_version,
    )


def stage_universal_ontology_mcp_server_installation(
    repo: Path,
    staging_directory: Path,
) -> StagedMcpServerInstallation:
    """Stage bundle bytes and a digest-bound installation record."""
    built_bundle = build_universal_ontology_mcp_application_bundle(repo)
    staging_directory.mkdir(parents=True, exist_ok=True)
    installed_application_bundle_file_name = (
        UNIVERSAL_ONTOLOGY_MCP_INSTALLED_APPLICATION_BUNDLE_PATH.name
    )
    staged_program_path = (
        staging_directory / installed_application_bundle_file_name
    )
    shutil.copy2(built_bundle.application_bundle_path, staged_program_path)

    # The canonical bundle is atomically replaceable so other verifiers never
    # observe it missing. A replacement between validation and this copy is
    # therefore legitimate, but it is not the snapshot this installation record
    # is authorized to describe. Bind the transaction to the bytes actually
    # staged before executable permissions or activation can proceed.
    staged_application_bundle_byte_length = staged_program_path.stat().st_size
    staged_application_bundle_sha256 = calculate_file_sha256(staged_program_path)

    if (
        staged_application_bundle_byte_length
        != built_bundle.application_bundle_byte_length
        or staged_application_bundle_sha256 != built_bundle.application_bundle_sha256
    ):
        raise SetupError(
            "The staged Universal Ontology MCP application bundle does not match "
            "the validated canonical bundle. Another build may have replaced the "
            "canonical path; rerun setup to validate and stage one snapshot."
        )

    if os.name != "nt":
        staged_program_path.chmod(staged_program_path.stat().st_mode | 0o111)

    source_git_head_commit = git_output(repo, "rev-parse", "HEAD")
    source_git_status = git_output(
        repo,
        "status",
        "--porcelain",
        "--untracked-files=all",
    )
    installation_record = {
        "installationRecordFormatVersion": (
            UNIVERSAL_ONTOLOGY_MCP_INSTALLATION_RECORD_FORMAT_VERSION
        ),
        "packageName": built_bundle.package_name,
        "packageVersion": built_bundle.package_version,
        "applicationBundleByteLength": (
            staged_application_bundle_byte_length
        ),
        "applicationBundleSha256": staged_application_bundle_sha256,
        "installedApplicationBundleRelativePath": (
            UNIVERSAL_ONTOLOGY_MCP_INSTALLED_APPLICATION_BUNDLE_PATH.as_posix()
        ),
        "sourceGitHeadCommit": source_git_head_commit,
        "sourceGitWorktreeState": (
            "modified" if source_git_status.strip() else "clean"
        ),
    }
    staged_installation_record_path = (
        staging_directory / "universal-ontology-mcp-server-installation.json"
    )
    write_utf8_text_file(
        staged_installation_record_path,
        json.dumps(installation_record, indent=2) + "\n",
    )
    return StagedMcpServerInstallation(
        staged_program_path=staged_program_path,
        installed_program_path=(
            repo / UNIVERSAL_ONTOLOGY_MCP_INSTALLED_APPLICATION_BUNDLE_PATH
        ),
        staged_installation_record_path=staged_installation_record_path,
        installed_installation_record_path=(
            repo / UNIVERSAL_ONTOLOGY_MCP_INSTALLATION_RECORD_PATH
        ),
    )


def verify_staged_universal_ontology_mcp_server_installation(
    repo: Path,
    staged_installation: StagedMcpServerInstallation,
) -> dict[str, object]:
    """Verify staged bytes through the official MCP v2 client executable."""
    node_command = require_command("node")
    verifier_path = SETUP_SCRIPT_PATH.with_name(
        "verifyUniversalOntologyMcpApplicationBundle.js"
    )
    result = run(
        [
            node_command,
            verifier_path,
            "--application-bundle",
            staged_installation.staged_program_path,
            (
                "--artifact-channel="
                f"{UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_CHANNEL_NAME}"
            ),
        ],
        cwd=repo,
        capture=True,
        check=False,
    )

    if result.returncode != 0:
        # The verifier already owns protocol and tool-surface diagnostics. Keep
        # its captured message useful without allowing control characters or an
        # unbounded child-process response into a setup terminal.
        verifier_diagnostic = "".join(
            character
            if character in {"\n", "\t"} or 0x20 <= ord(character) < 0x7F
            else "?"
            for character in (result.stderr or "")
        ).strip()

        if not verifier_diagnostic:
            verifier_diagnostic = "(no stderr diagnostic)"
        elif (
            len(verifier_diagnostic)
            > CAPTURED_MCP_VERIFIER_DIAGNOSTIC_MAXIMUM_CHARACTER_COUNT
        ):
            verifier_diagnostic = (
                verifier_diagnostic[
                    :CAPTURED_MCP_VERIFIER_DIAGNOSTIC_MAXIMUM_CHARACTER_COUNT
                ]
                + "\n[diagnostic truncated]"
            )

        raise SetupError(
            "Universal Ontology MCP application-bundle verifier exited with "
            f"status {result.returncode}: {verifier_diagnostic}"
        )

    try:
        verification = _parse_json_without_duplicate_object_members(
            result.stdout,
            description=(
                "Universal Ontology MCP application-bundle verifier output"
            ),
        )
    except json.JSONDecodeError as exc:
        raise SetupError(
            "Universal Ontology MCP application-bundle verifier returned "
            "invalid JSON."
        ) from exc

    _package_name, package_version = (
        read_universal_ontology_mcp_package_identity(repo)
    )
    expected = {
        "ontologyQueryArtifactChannelName": (
            UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_CHANNEL_NAME
        ),
        "serverInfo": {
            "name": UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_SERVER_NAME,
            "title": UNIVERSAL_ONTOLOGY_MCP_PROTOCOL_SERVER_TITLE,
            "version": package_version,
        },
        "toolNames": list(UNIVERSAL_ONTOLOGY_MCP_ENABLED_TOOL_NAMES),
    }

    if verification != expected:
        raise SetupError(
            "Universal Ontology MCP application-bundle verifier returned an "
            f"unexpected result: {verification!r}"
        )

    return verification


def read_installation_record(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}

    try:
        installation_record = _parse_json_without_duplicate_object_members(
            path.read_text(encoding="utf-8"),
            description="MCP installation record",
        )
    except (SetupError, UnicodeDecodeError, json.JSONDecodeError):
        # A damaged record only costs one redundant download.
        return {}

    return installation_record if isinstance(installation_record, dict) else {}


def stage_github_mcp_server_installation(
    repo: Path,
    staging_directory: Path,
) -> StagedMcpServerInstallation:
    """Stage the current checksum-verified GitHub MCP Server release."""
    system = platform.system()
    machine = platform.machine()
    release_asset_name = github_mcp_release_archive_asset_name(system, machine)
    executable_name = github_mcp_executable_file_name(system)
    installed_executable_relative_path = (
        GITHUB_MCP_INSTALLED_EXECUTABLE_DIRECTORY / executable_name
    )
    installed_executable_path = repo / installed_executable_relative_path
    installed_record_path = repo / GITHUB_MCP_INSTALLATION_RECORD_PATH
    release_tag, release_assets = resolve_latest_github_mcp_release()
    preceding_record = read_installation_record(installed_record_path)
    current_installation = (
        preceding_record.get("installationRecordFormatVersion")
        == GITHUB_MCP_INSTALLATION_RECORD_FORMAT_VERSION
        and preceding_record.get("releaseTag") == release_tag
        and preceding_record.get("releaseAssetName") == release_asset_name
        and preceding_record.get("installedExecutableRelativePath")
        == installed_executable_relative_path.as_posix()
        and isinstance(preceding_record.get("executableSha256"), str)
        and installed_executable_path.is_file()
        and calculate_file_sha256(installed_executable_path)
        == preceding_record["executableSha256"]
    )
    staging_directory.mkdir(parents=True, exist_ok=True)
    staged_executable_path = staging_directory / executable_name

    if current_installation:
        shutil.copy2(installed_executable_path, staged_executable_path)
    else:
        release_payload = download_verified_github_mcp_release_archive(
            release_tag,
            release_assets,
            release_asset_name,
        )
        staged_archive_path = staging_directory / release_asset_name
        staged_archive_path.write_bytes(release_payload)
        extract_release_archive_executable(
            staged_archive_path,
            executable_name,
            staged_executable_path,
        )

    staged_executable_path.chmod(
        staged_executable_path.stat().st_mode | 0o111
    )
    installation_record = {
        "installationRecordFormatVersion": (
            GITHUB_MCP_INSTALLATION_RECORD_FORMAT_VERSION
        ),
        "releaseTag": release_tag,
        "releaseAssetName": release_asset_name,
        "executableSha256": calculate_file_sha256(staged_executable_path),
        "installedExecutableRelativePath": (
            installed_executable_relative_path.as_posix()
        ),
    }
    staged_record_path = staging_directory / "github-mcp-server-installation.json"
    write_utf8_text_file(
        staged_record_path,
        json.dumps(installation_record, indent=2) + "\n",
    )
    return StagedMcpServerInstallation(
        staged_program_path=staged_executable_path,
        installed_program_path=installed_executable_path,
        staged_installation_record_path=staged_record_path,
        installed_installation_record_path=installed_record_path,
    )


def verify_staged_github_mcp_server_installation(
    repo: Path,
    staged_installation: StagedMcpServerInstallation,
) -> str:
    """Prove that the staged native executable starts on this machine."""
    executable_path = staged_installation.staged_program_path.resolve()
    result = subprocess.run(
        [str(executable_path), "--version"],
        cwd=str(repo),
        check=False,
        text=True,
        capture_output=True,
    )

    if result.returncode != 0:
        raise SetupError(
            "The staged GitHub MCP Server executable did not run.\n"
            f"Executable: {executable_path}\n"
            f"Exit status: {result.returncode}\n"
            f"{result.stderr.strip() or result.stdout.strip()}"
        )

    reported_lines = (result.stdout or result.stderr).strip().splitlines()
    return (
        " ".join(line.strip() for line in reported_lines[:2])
        or "(reported no version)"
    )


def set_up_repository_local_mcp_servers(
    repo: Path,
) -> RepositoryLocalMcpSetupResult:
    """Stage, verify, and transactionally activate repository-local servers."""
    ensure_generated_installation_root_is_safe(repo)

    with acquire_repository_local_mcp_setup_lock(repo):
        # Recheck after acquiring the single-writer lock so no competing setup
        # can change generated path types between validation and activation.
        ensure_generated_installation_root_is_safe(repo)

        # Configuration ownership conflicts are cheap to diagnose. Render
        # before downloads or builds so a conflict cannot waste toolchain work.
        rendered_documents = render_mcp_host_configuration_documents(repo)

        with tempfile.TemporaryDirectory(
            prefix="repository-mcp-setup-"
        ) as scratch:
            staging_directory = Path(scratch)
            github_installation = stage_github_mcp_server_installation(
                repo,
                staging_directory,
            )
            ontology_installation = (
                stage_universal_ontology_mcp_server_installation(
                    repo,
                    staging_directory,
                )
            )
            github_version = verify_staged_github_mcp_server_installation(
                repo,
                github_installation,
            )
            ontology_verification = (
                verify_staged_universal_ontology_mcp_server_installation(
                    repo,
                    ontology_installation,
                )
            )
            activated_paths = (
                activate_staged_mcp_server_installations_and_host_configurations(
                    repo,
                    [github_installation, ontology_installation],
                    rendered_documents,
                )
            )

    return RepositoryLocalMcpSetupResult(
        github_mcp_server_version=github_version,
        universal_ontology_mcp_verification=ontology_verification,
        activated_paths=tuple(activated_paths),
    )


def parse_args(arguments: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Install repository-local MCP servers and point every supported "
            "agent host at them."
        )
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Verify checked-in MCP host configuration documents without "
            "downloading, building, installing, starting, or writing anything."
        ),
    )
    return parser.parse_args(arguments)


def main(arguments: Sequence[str] | None = None) -> int:
    arguments_namespace = parse_args(arguments)

    try:
        repo = derive_repo_from_script(__file__)
        print(f"Repository root: {repo}")

        if arguments_namespace.check:
            checked_paths = check_mcp_host_configuration_documents(repo)
            print("\nMCP host configuration documents are current:")

            for path in checked_paths:
                print(f"  {path.relative_to(repo).as_posix()}")

            return 0

        setup_result = set_up_repository_local_mcp_servers(repo)

        print(f"\n  GitHub: {setup_result.github_mcp_server_version}")

        if GITHUB_MCP_TOKEN_VARIABLE in os.environ:
            # Never print the credential value. The variable name is enough to
            # explain why the GitHub server will not begin browser-based OAuth.
            print(
                f"  GitHub authentication: {GITHUB_MCP_TOKEN_VARIABLE} is set "
                "and takes precedence over browser-based OAuth."
            )
        else:
            print(
                "  GitHub authentication: browser-based OAuth begins when the "
                "GitHub MCP Server first needs authorization."
            )

        ontology_verification = (
            setup_result.universal_ontology_mcp_verification
        )
        print(
            "  Universal Ontology: "
            + ", ".join(ontology_verification["toolNames"])
        )

        for path in setup_result.activated_paths:
            print(f"  Activated: {path.relative_to(repo).as_posix()}")

        print("\nMCP server setup is complete.")

        return 0

    except (SetupError, subprocess.CalledProcessError, OSError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)

        return 1


if __name__ == "__main__":
    raise SystemExit(main())
