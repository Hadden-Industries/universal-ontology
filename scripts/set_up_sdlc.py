"""Merge the approved repository Codex policy and activate its local SDLC skills.

This composes the existing setup transaction. It installs no global tools, changes
no hook trust, and performs no GitHub mutations or MCP server downloads.
"""
from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path

from _commands import SetupError
from _repository import derive_repo_from_script
from set_up_mcp_servers import (
    REPOSITORY_ROOTED_NODE_ENTRY_POINT_BOOTSTRAP_SOURCE,
    RenderedRepositoryConfigurationDocument,
    _parse_json_without_duplicate_object_members,
    acquire_repository_setup_lock,
    ensure_generated_installation_root_is_safe,
    ensure_repository_configuration_destinations_are_safe,
    publish_repository_configuration_documents,
)

SOURCE_ROOT = Path(".sdlc/codex")
ROOT_MARKER = "SDLC root policy"
AGENTS_MARKER = "SDLC agents"
STOP_STATUS = "Checking current SDLC verification evidence"


def remove_managed_block(text: str, name: str) -> str:
    begin = f"# BEGIN {name} - managed by scripts/set_up_sdlc.py"
    end = f"# END {name} - managed by scripts/set_up_sdlc.py"
    lines = text.splitlines(keepends=True)
    starts = [i for i, line in enumerate(lines) if line.rstrip("\r\n") == begin]
    ends = [i for i, line in enumerate(lines) if line.rstrip("\r\n") == end]
    if not starts and not ends:
        return text
    if len(starts) != 1 or len(ends) != 1 or starts[0] >= ends[0]:
        raise SetupError(f"Ambiguous or incomplete managed block: {name}")
    return "".join(lines[:starts[0]] + lines[ends[0] + 1:])


def managed_block(name: str, body: str) -> str:
    return (f"# BEGIN {name} - managed by scripts/set_up_sdlc.py\n"
            + body.strip() + "\n"
            + f"# END {name} - managed by scripts/set_up_sdlc.py\n")


def merge_codex_sdlc_configuration(existing: str, selected: str) -> str:
    """Preserve unrelated TOML bytes and reject unowned policy conflicts."""
    desired = tomllib.loads(selected)
    tomllib.loads(existing)
    remaining = remove_managed_block(remove_managed_block(existing, ROOT_MARKER), AGENTS_MARKER)
    independent = tomllib.loads(remaining)
    conflicts = set(desired) & set(independent)
    if conflicts:
        raise SetupError("Unmanaged Codex policy conflicts: " + ", ".join(sorted(conflicts)))
    root_policy, agents = selected.split("[agents]", 1)
    result = (managed_block(ROOT_MARKER, root_policy)
              + remaining.strip("\r\n") + "\n\n"
              + managed_block(AGENTS_MARKER, "[agents]" + agents))
    if tomllib.loads(result) != {**independent, **desired}:
        raise SetupError("Merged Codex settings differ from the approved semantic result.")
    return result


def sdlc_stop_hook(source: Path | None = None) -> dict:
    # The existing MCP bootstrap already roots a Node entry point in this Git checkout.
    # POSIX shell quoting preserves the shared bootstrap verbatim. Windows
    # PowerShell 5.1 strips embedded quotes when passing native arguments, so
    # its supported command uses native path/cwd operations instead of --eval.
    bootstrap = REPOSITORY_ROOTED_NODE_ENTRY_POINT_BOOTSTRAP_SOURCE
    if "'" in bootstrap:
        raise SetupError("Review hook command quoting after changing the shared Node bootstrap.")
    command = ("node --input-type=module --eval '" + bootstrap
               + "' -- scripts/runRepositoryPython.js scripts/sdlc_stop_gate.py")
    windows_script = (
        "$sdlcRepositoryRoot = & git rev-parse --show-toplevel; "
        "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; "
        "Set-Location -LiteralPath $sdlcRepositoryRoot -ErrorAction Stop; "
        "& node (Join-Path $sdlcRepositoryRoot 'scripts/runRepositoryPython.js') "
        "'scripts/sdlc_stop_gate.py'; exit $LASTEXITCODE"
    )
    # Native Codex invokes Windows hooks through cmd.exe, so select the interpreter.
    windows_command = 'powershell.exe -NoLogo -NoProfile -NonInteractive -Command "' + windows_script + '"'
    template_path = source or Path(__file__).resolve().parents[1] / SOURCE_ROOT / "hooks.json"
    template = _parse_json_without_duplicate_object_members(template_path.read_text(encoding="utf-8"), description="SDLC hook template")
    group = template["hooks"]["Stop"][0]
    hook = group["hooks"][0]
    if len(template["hooks"]["Stop"]) != 1 or len(group["hooks"]) != 1:
        raise SetupError("Review SDLC hook composition before adding further template hooks.")
    for field, rendered in (("command", command), ("commandWindows", windows_command)):
        if hook[field] != "REPOSITORY_SDLC_STOP_COMMAND":
            raise SetupError(f"Unexpected SDLC hook command template: {field}")
        hook[field] = rendered
    return group


def merge_sdlc_hooks(existing: str, source: Path | None = None) -> str:
    document = (_parse_json_without_duplicate_object_members(existing, description="Codex hooks")
                if existing else {})
    if not isinstance(document, dict):
        raise SetupError("Codex hooks must be a JSON object.")
    hooks = document.setdefault("hooks", {})
    if not isinstance(hooks, dict) or not isinstance(hooks.get("Stop", []), list):
        raise SetupError("Codex hooks/Stop has an invalid structure.")
    selected = sdlc_stop_hook(source)
    preserved = []
    matched = 0
    for entry in hooks.get("Stop", []):
        if not isinstance(entry, dict) or not isinstance(entry.get("hooks"), list):
            raise SetupError("An existing Stop hook group is malformed; preserve and review it.")
        if isinstance(entry, dict) and any(
            isinstance(hook, dict) and hook.get("statusMessage") == STOP_STATUS
            for hook in entry.get("hooks", [])
        ):
            if len(entry.get("hooks", [])) != 1:
                raise SetupError("The SDLC Stop group contains unrelated hooks; preserve and review it.")
            matched += 1
        else:
            preserved.append(entry)
    if matched > 1:
        raise SetupError("Multiple SDLC Stop hooks require an explicit ownership decision.")
    hooks["Stop"] = [*preserved, selected]
    return json.dumps(document, indent=2) + "\n"


def render_sdlc_configuration(repo: Path) -> list[RenderedRepositoryConfigurationDocument]:
    source = repo / SOURCE_ROOT
    files = [(Path(".codex/config.toml"), source / "config.toml"),
             (Path(".codex/hooks.json"), None)]
    files.extend((Path(".codex/agents") / item.name, item)
                 for item in sorted((source / "agents").glob("*.toml")))
    files.append((Path(".codex/rules/default.rules"), source / "rules/default.rules"))
    declared = tomllib.loads((source / "config.toml").read_text(encoding="utf-8"))["agents"]
    for name, role in declared.items():
        if isinstance(role, dict) and not (source / role["config_file"]).is_file():
            raise SetupError(f"Missing selected Codex role: {name}")
    ensure_repository_configuration_destinations_are_safe(repo, [path for path, _ in files])
    documents = []
    for relative, original in files:
        destination = repo / relative
        observed = destination.read_bytes() if destination.exists() else None
        existing = observed.decode("utf-8-sig") if observed is not None else ""
        if relative.name == "config.toml":
            contents = merge_codex_sdlc_configuration(existing, original.read_text(encoding="utf-8"))
        elif relative.name == "hooks.json":
            contents = merge_sdlc_hooks(existing, source / "hooks.json")
        else:
            ensure_repository_configuration_destinations_are_safe(repo, [original.relative_to(repo)])
            contents = original.read_text(encoding="utf-8")
            if original.suffix == ".toml":
                tomllib.loads(contents)
            if observed is not None and existing != contents:
                raise SetupError(f"Existing {relative} differs from the selected source; preserve and review it.")
        documents.append(RenderedRepositoryConfigurationDocument(destination, contents, observed))
    return documents


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare generated Codex files without writing.")
    parser.add_argument("--configuration-only", action="store_true", help="Do not activate local skills.")
    args = parser.parse_args()
    try:
        repo = derive_repo_from_script(__file__)
        if sys.version_info < (3, 14):
            raise SetupError("SDLC setup requires the selected Python 3.14 runtime in .venv.")
        if args.check:
            documents = render_sdlc_configuration(repo)
            stale = [str(item.destination_path.relative_to(repo)) for item in documents
                     if item.observed_destination_bytes != item.rendered_contents.encode("utf-8")]
            if stale:
                raise SetupError("Generated Codex configuration differs: " + ", ".join(stale))
            print("Repository Codex configuration is current; host loading/trust is a separate check.")
            return 0
        ensure_generated_installation_root_is_safe(repo)
        with acquire_repository_setup_lock(repo):
            if not args.configuration_only:
                from set_up_agent_skills import ensure_agent_skills, preflight_local_skill_activation
                preflight_local_skill_activation(repo, ("codex",))
            documents = render_sdlc_configuration(repo)
            publish_repository_configuration_documents(repo, documents)
            if not args.configuration_only:
                ensure_agent_skills(repo, ("codex",), local_only=True)
        print("Repository SDLC files are configured. This does not declare deployment or hook trust.")
        return 0
    except (SetupError, OSError, ValueError) as exc:
        print(f"SDLC setup failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
