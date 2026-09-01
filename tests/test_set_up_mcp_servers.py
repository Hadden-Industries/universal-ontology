import contextlib
import hashlib
import io
import inspect
import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import unittest
import zipfile
from pathlib import Path
from unittest import mock


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIRECTORY = REPOSITORY_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIRECTORY))

import set_up_mcp_servers  # noqa: E402


def require_setup_callable(test_case: unittest.TestCase, name: str):
    """Fail as an assertion when a wished-for setup seam is still absent."""
    value = getattr(set_up_mcp_servers, name, None)
    test_case.assertTrue(callable(value), f"Missing setup function: {name}")
    return value


def rendered_mcp_host_configuration_document(
    destination_path: Path,
    rendered_contents: str,
    observed_destination_bytes: bytes | None,
):
    """Construct the installer's byte-guarded host-document value object."""
    document_type = getattr(
        set_up_mcp_servers,
        "RenderedMcpHostConfigurationDocument",
        None,
    )

    if document_type is None:
        raise AssertionError("Missing RenderedMcpHostConfigurationDocument")

    return document_type(
        destination_path=destination_path,
        rendered_contents=rendered_contents,
        observed_destination_bytes=observed_destination_bytes,
    )


class MergeJsonMcpConfigurationTests(unittest.TestCase):
    def test_duplicate_json_object_members_are_rejected_as_ambiguous(self):
        merge_configuration = require_setup_callable(
            self,
            "merge_json_mcp_host_configuration",
        )
        ambiguous_configuration = (
            '{"mcpServers": {}, "mcpServers": '
            '{"independent": {"command": "other"}}}'
        )

        with self.assertRaisesRegex(
            set_up_mcp_servers.SetupError,
            "duplicate JSON object member.*mcpServers",
        ):
            merge_configuration(
                ambiguous_configuration,
                "github",
                {"command": "node", "args": ["launcher.js", "stdio"]},
            )

    def test_non_finite_json_constants_are_rejected_as_non_standard(self):
        merge_configuration = require_setup_callable(
            self,
            "merge_json_mcp_host_configuration",
        )

        for non_standard_constant in ("NaN", "Infinity", "-Infinity"):
            with self.subTest(non_standard_constant=non_standard_constant):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    r"not valid JSON|non-standard JSON constant",
                ):
                    merge_configuration(
                        '{"unrelatedHostSetting": '
                        f"{non_standard_constant}"
                        "}",
                        "github",
                        {"command": "node", "args": ["launcher.js", "stdio"]},
                    )

    def test_managed_server_replaces_conflicting_transport_and_authentication(self):
        existing_configuration = json.dumps(
            {
                "mcpServers": {
                    "github": {
                        "type": "http",
                        "url": "https://api.githubcopilot.com/mcp/",
                        "headers": {"Authorization": "Bearer private-token"},
                        "env": {
                            "GITHUB_PERSONAL_ACCESS_TOKEN": "private-token"
                        },
                    },
                    "independent": {
                        "command": "independent-server",
                        "args": ["--stdio"],
                    },
                },
                "unrelatedHostSetting": {"enabled": True},
            }
        )
        managed_entry = {
            "command": ".agent-tools/bin/github-mcp-server",
            "args": ["stdio"],
        }

        merged_configuration = json.loads(
            set_up_mcp_servers.merge_json_mcp_host_configuration(
                existing_configuration,
                "github",
                managed_entry,
            )
        )

        # The script owns the complete named server entry. Retaining an old
        # transport or credential would make the result ambiguous or silently
        # bypass the browser-based OAuth flow.
        self.assertEqual(
            merged_configuration["mcpServers"]["github"],
            managed_entry,
        )
        self.assertEqual(
            merged_configuration["mcpServers"]["independent"],
            {
                "command": "independent-server",
                "args": ["--stdio"],
            },
        )
        self.assertEqual(
            merged_configuration["unrelatedHostSetting"],
            {"enabled": True},
        )

    def test_managed_server_replacement_removes_only_named_legacy_entries(self):
        existing_configuration = json.dumps(
            {
                "mcpServers": {
                    "github-mcp-server": {"command": "legacy-github"},
                    "universal_ontology_local": {
                        "url": "http://127.0.0.1:8000/mcp"
                    },
                    "independent": {"command": "independent-server"},
                }
            }
        )

        merge_json_mcp_host_configuration = (
            set_up_mcp_servers.merge_json_mcp_host_configuration
        )
        self.assertIn(
            "remove_names",
            inspect.signature(merge_json_mcp_host_configuration).parameters,
        )
        merged_configuration = json.loads(
            merge_json_mcp_host_configuration(
                existing_configuration,
                "universal_ontology",
                {"command": "node", "args": ["ontology-server.mjs"]},
                remove_names=("universal_ontology_local",),
            )
        )

        self.assertNotIn(
            "universal_ontology_local",
            merged_configuration["mcpServers"],
        )
        self.assertIn(
            "github-mcp-server",
            merged_configuration["mcpServers"],
        )
        self.assertEqual(
            merged_configuration["mcpServers"]["independent"],
            {"command": "independent-server"},
        )


class HostConfigurationRenderingTests(unittest.TestCase):
    def test_renders_an_explicit_http_query_artifact_source(self):
        entry = set_up_mcp_servers.universal_ontology_mcp_host_configuration_entry(
            query_artifact_source_kind="http",
            query_artifact_channel_name="stable",
            query_artifact_base_url=(
                "https://example.cloudfront.net/ontology/query/v1/"
            ),
        )

        self.assertEqual(
            entry["args"][-4:],
            [
                ".agent-tools/bin/universal-ontology-mcp-server.mjs",
                "--query-artifact-source=http",
                "--artifact-channel=stable",
                (
                    "--artifact-base-url="
                    "https://example.cloudfront.net/ontology/query/v1/"
                ),
            ],
        )

    def test_renders_portable_github_and_ontology_entries_for_every_host(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            rendered_documents = render_documents(repository_root)

        rendered_by_path = {
            document.destination_path.relative_to(
                repository_root
            ).as_posix(): document.rendered_contents
            for document in rendered_documents
        }
        portable_document = json.loads(rendered_by_path[".mcp.json"])
        expected_github_entry = portable_document["mcpServers"]["github"]
        expected_ontology_entry = portable_document["mcpServers"][
            "universal_ontology"
        ]

        self.assertEqual(expected_github_entry["command"], "node")
        self.assertEqual(
            expected_github_entry["args"][:2],
            ["--input-type=module", "--eval"],
        )
        self.assertEqual(expected_github_entry["args"][3], "--")
        self.assertEqual(
            expected_github_entry["args"][-2:],
            ["scripts/launchGitHubMcpServer.js", "stdio"],
        )
        self.assertEqual(expected_ontology_entry["command"], "node")
        self.assertEqual(
            expected_ontology_entry["args"][:4],
            expected_github_entry["args"][:4],
        )
        self.assertEqual(
            expected_ontology_entry["args"][-3:],
            [
                ".agent-tools/bin/universal-ontology-mcp-server.mjs",
                "--query-artifact-source=file-system",
                "--query-artifact-root-directory=dist/query/v1",
            ],
        )

        for relative_path in (".agents/mcp_config.json",):
            document = json.loads(rendered_by_path[relative_path])
            self.assertEqual(
                document["mcpServers"]["github"],
                expected_github_entry,
            )
            self.assertEqual(
                document["mcpServers"]["universal_ontology"],
                expected_ontology_entry,
            )

        codex_document = tomllib.loads(rendered_by_path[".codex/config.toml"])
        self.assertEqual(
            {
                key: codex_document["mcp_servers"]["github"][key]
                for key in ("command", "args")
            },
            expected_github_entry,
        )
        self.assertEqual(
            codex_document["mcp_servers"]["universal_ontology"],
            {
                **expected_ontology_entry,
                "startup_timeout_sec": 15,
                "tool_timeout_sec": 30,
                "required": True,
                "enabled_tools": ["search_entities", "resolve_entity"],
                "default_tools_approval_mode": "writes",
            },
        )

    def test_generated_entries_launch_from_a_repository_subdirectory(self):
        """The host's session directory must not redefine repository paths."""
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )
        node_command = shutil.which("node")
        git_command = shutil.which("git")

        if node_command is None or git_command is None:
            self.skipTest("This integration check requires Node.js and Git on PATH.")

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch) / "repository"
            repository_root.mkdir()
            subprocess.run(
                [git_command, "init", "--quiet", str(repository_root)],
                check=True,
                capture_output=True,
                text=True,
            )
            nested_session_directory = repository_root / "src" / "nested"
            nested_session_directory.mkdir(parents=True)
            rendered_documents = render_documents(repository_root)
            portable_configuration = json.loads(
                next(
                    document.rendered_contents
                    for document in rendered_documents
                    if document.destination_path == repository_root / ".mcp.json"
                )
            )
            configured_servers = portable_configuration["mcpServers"]

            entry_point_scenarios = (
                (
                    repository_root / "scripts" / "launchGitHubMcpServer.js",
                    configured_servers["github"],
                    ["stdio"],
                ),
                (
                    repository_root
                    / ".agent-tools"
                    / "bin"
                    / "universal-ontology-mcp-server.mjs",
                    configured_servers["universal_ontology"],
                    [
                        "--query-artifact-source=file-system",
                        "--query-artifact-root-directory=dist/query/v1",
                    ],
                ),
            )

            for entry_point_path, entry, expected_arguments in entry_point_scenarios:
                with self.subTest(entry_point=entry_point_path.name):
                    entry_point_path.parent.mkdir(parents=True, exist_ok=True)
                    entry_point_path.write_text(
                        "process.stdout.write(JSON.stringify({"
                        "workingDirectoryPath: process.cwd(), "
                        "arguments: process.argv.slice(2)"
                        "}));\n",
                        encoding="utf-8",
                    )
                    completed = subprocess.run(
                        [entry["command"], *entry["args"]],
                        cwd=nested_session_directory,
                        check=False,
                        capture_output=True,
                        text=True,
                    )

                    self.assertEqual(completed.returncode, 0, completed.stderr)
                    observation = json.loads(completed.stdout)
                    self.assertEqual(
                        Path(observation["workingDirectoryPath"]).resolve(),
                        repository_root.resolve(),
                    )
                    self.assertEqual(
                        observation["arguments"],
                        expected_arguments,
                    )

    def test_github_entry_derives_its_launcher_from_the_setup_script_location(self):
        create_entry = require_setup_callable(
            self,
            "github_mcp_host_configuration_entry",
        )
        relocated_setup_script_path = (
            REPOSITORY_ROOT / "automation" / "set_up_mcp_servers.py"
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "SETUP_SCRIPT_PATH",
            relocated_setup_script_path,
            create=True,
        ):
            entry = create_entry()

        self.assertIn(
            "automation/launchGitHubMcpServer.js",
            entry["args"],
        )

    def test_preserves_unmanaged_settings_and_removes_approved_legacy_entries(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            (repository_root / ".mcp.json").write_text(
                json.dumps(
                    {
                        "mcpServers": {
                            "github-mcp-server": {"command": "legacy"},
                            "universal_ontology_local": {
                                "url": "http://127.0.0.1:8000/mcp"
                            },
                            "independent": {"command": "independent"},
                        },
                        "unrelatedHostSetting": True,
                    }
                ),
                encoding="utf-8",
            )
            codex_path = repository_root / ".codex" / "config.toml"
            codex_path.parent.mkdir(parents=True)
            codex_path.write_text(
                "\n".join(
                    [
                        "[mcp_servers.universal_ontology_local]",
                        'url = "http://127.0.0.1:8000/mcp"',
                        "startup_timeout_sec = 10",
                        "tool_timeout_sec = 30",
                        'default_tools_approval_mode = "writes"',
                        'enabled_tools = ["search_entities", "resolve_entity"]',
                        "",
                        "[sandbox_workspace_write]",
                        "network_access = true",
                        "",
                    ]
                ),
                encoding="utf-8",
            )

            rendered_documents = render_documents(repository_root)

        rendered_by_path = {
            document.destination_path.relative_to(
                repository_root
            ).as_posix(): document.rendered_contents
            for document in rendered_documents
        }
        claude_document = json.loads(rendered_by_path[".mcp.json"])
        self.assertNotIn("github-mcp-server", claude_document["mcpServers"])
        self.assertNotIn(
            "universal_ontology_local",
            claude_document["mcpServers"],
        )
        self.assertEqual(
            claude_document["mcpServers"]["independent"],
            {"command": "independent"},
        )
        self.assertIs(claude_document["unrelatedHostSetting"], True)

        codex_document = tomllib.loads(rendered_by_path[".codex/config.toml"])
        self.assertNotIn(
            "universal_ontology_local",
            codex_document["mcp_servers"],
        )
        self.assertEqual(
            codex_document["sandbox_workspace_write"],
            {"network_access": True},
        )

    def test_unmanaged_codex_conflict_prevents_every_file_write(self):
        write_documents = require_setup_callable(
            self,
            "write_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            original_documents = {
                Path(".mcp.json"): '{"mcpServers": {}}\n',
                Path(".agents/mcp_config.json"): '{"mcpServers": {}}\n',
                Path(".codex/config.toml"): "\n".join(
                    [
                        "[mcp_servers.universal_ontology]",
                        'command = "custom-server"',
                        "",
                    ]
                ),
            }
            for relative_path, contents in original_documents.items():
                path = repository_root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(contents, encoding="utf-8")

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"already declares \[mcp_servers\.universal_ontology\]",
            ):
                write_documents(repository_root)

            for relative_path, contents in original_documents.items():
                self.assertEqual(
                    (repository_root / relative_path).read_text(encoding="utf-8"),
                    contents,
                )

    def test_codex_descendant_table_outside_managed_block_is_an_ownership_conflict(
        self,
    ):
        merge_codex_configuration = require_setup_callable(
            self,
            "merge_codex_mcp_host_configuration",
        )
        managed_block = merge_codex_configuration(
            None,
            "github",
            {"command": "node", "args": ["scripts/launcher.js", "stdio"]},
        )
        configuration_with_unmanaged_environment = (
            managed_block
            + "\n[mcp_servers.github.env]\n"
            + 'GITHUB_PERSONAL_ACCESS_TOKEN = "must-not-survive"\n'
        )

        with self.assertRaisesRegex(
            set_up_mcp_servers.SetupError,
            r"descendant.*mcp_servers\.github|mcp_servers\.github.*descendant",
        ):
            merge_codex_configuration(
                configuration_with_unmanaged_environment,
                "github",
                {
                    "command": "node",
                    "args": ["scripts/launcher.js", "stdio"],
                },
            )

    def test_removing_legacy_codex_table_preserves_comments_before_next_table(self):
        remove_legacy_table = require_setup_callable(
            self,
            "remove_codex_mcp_server_table",
        )
        original = "\n".join(
            [
                "[mcp_servers.universal_ontology_local]",
                'url = "http://127.0.0.1:8000/mcp"',
                "",
                "# Network access is required by installed stdio servers.",
                "[sandbox_workspace_write]",
                "network_access = true",
                "",
            ]
        )

        updated = remove_legacy_table(
            original,
            "universal_ontology_local",
        )

        self.assertNotIn("universal_ontology_local", updated)
        self.assertIn(
            "# Network access is required by installed stdio servers.\n"
            "[sandbox_workspace_write]",
            updated,
        )

    def test_removing_legacy_codex_table_removes_its_descendant_table_subtree(
        self,
    ):
        remove_legacy_table = require_setup_callable(
            self,
            "remove_codex_mcp_server_table",
        )
        original = "\n".join(
            [
                "[mcp_servers.github-mcp-server]",
                'command = "legacy-launcher"',
                "[unrelated]",
                "retained = true",
                "[mcp_servers.github-mcp-server.env]",
                'GITHUB_PERSONAL_ACCESS_TOKEN = "must-not-survive"',
                "[also_unrelated]",
                'retained = "after descendant"',
                "",
            ]
        )

        updated = remove_legacy_table(original, "github-mcp-server")
        parsed = tomllib.loads(updated)

        self.assertNotIn("github-mcp-server", parsed.get("mcp_servers", {}))
        self.assertNotIn("must-not-survive", updated)
        self.assertEqual(parsed["unrelated"], {"retained": True})
        self.assertEqual(
            parsed["also_unrelated"],
            {"retained": "after descendant"},
        )

    def test_removing_legacy_codex_table_preserves_a_following_array_table(self):
        remove_legacy_table = require_setup_callable(
            self,
            "remove_codex_mcp_server_table",
        )
        original = "\n".join(
            [
                "[mcp_servers.universal_ontology_local]",
                'url = "http://127.0.0.1:8000/mcp"',
                "",
                "[[profiles]]",
                'name = "preserve-me"',
                "",
            ]
        )

        updated = remove_legacy_table(
            original,
            "universal_ontology_local",
        )
        parsed = tomllib.loads(updated)

        self.assertNotIn(
            "universal_ontology_local",
            parsed.get("mcp_servers", {}),
        )
        self.assertEqual(parsed["profiles"], [{"name": "preserve-me"}])

    def test_rejects_a_semantically_legacy_table_that_cannot_be_safely_rewritten(
        self,
    ):
        """Parsed TOML identity must catch spellings the source editor omits."""
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            codex_path = repository_root / ".codex" / "config.toml"
            codex_path.parent.mkdir(parents=True)
            codex_path.write_text(
                "\n".join(
                    [
                        '[mcp_servers . "universal_ontology_local"]',
                        'url = "http://127.0.0.1:8000/mcp"',
                        "",
                    ]
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"legacy.*universal_ontology_local.*safely rewrite",
            ):
                render_documents(repository_root)

    def test_configuration_parent_must_be_a_real_directory(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            (repository_root / ".codex").write_text(
                "not a directory",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"\.codex.*directory|directory.*\.codex",
            ):
                render_documents(repository_root)

    def test_configuration_destination_must_not_be_a_symbolic_link(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            repository_root = root / "repository"
            repository_root.mkdir()
            external_configuration = root / "external.json"
            external_configuration.write_text(
                '{"mcpServers": {}}\n',
                encoding="utf-8",
            )

            try:
                os.symlink(
                    external_configuration,
                    repository_root / ".mcp.json",
                )
            except OSError as error:
                self.skipTest(
                    f"Symbolic-link creation is unavailable on this host: {error}"
                )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "symbolic link",
            ):
                render_documents(repository_root)

            self.assertEqual(
                external_configuration.read_text(encoding="utf-8"),
                '{"mcpServers": {}}\n',
            )

    def test_windows_directory_junction_is_detected_on_python_3_11(self):
        path_is_link_or_junction = require_setup_callable(
            self,
            "_path_is_symbolic_link_or_junction",
        )
        junction_path = mock.Mock()
        junction_path.is_symlink.return_value = False
        junction_path.lstat.return_value = mock.Mock(
            st_reparse_tag=(
                set_up_mcp_servers.WINDOWS_DIRECTORY_JUNCTION_REPARSE_TAG
            )
        )

        # Python 3.11 has `st_reparse_tag` but not `Path.is_junction()`. Simulate
        # that documented minimum-runtime surface even when this test itself is
        # running on a newer interpreter.
        with mock.patch.object(set_up_mcp_servers.os, "name", "nt"):
            self.assertTrue(path_is_link_or_junction(junction_path))

        junction_path.lstat.assert_called_once_with()


class RepositoryLocalMcpSetupLockTests(unittest.TestCase):
    def test_second_setup_process_cannot_acquire_the_repository_lock(self):
        acquire_setup_lock = require_setup_callable(
            self,
            "acquire_repository_local_mcp_setup_lock",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)

            with acquire_setup_lock(repository_root):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "another repository-local MCP setup is already running",
                ):
                    with acquire_setup_lock(repository_root):
                        self.fail("the second setup lock must not be acquired")

            # The persistent lock file is harmless generated state; releasing
            # the OS-level lock, rather than deleting a racy sentinel, makes a
            # crash self-recovering.
            with acquire_setup_lock(repository_root):
                pass


class ReadOnlyHostConfigurationCheckTests(unittest.TestCase):
    def test_check_reports_every_missing_checked_in_document_without_writing(self):
        check_documents = require_setup_callable(
            self,
            "check_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)

            with self.assertRaises(set_up_mcp_servers.SetupError) as raised:
                check_documents(repository_root)

            message = str(raised.exception)
            self.assertIn(".mcp.json", message)
            self.assertIn(".codex/config.toml", message)
            self.assertFalse((repository_root / ".mcp.json").exists())
            self.assertFalse((repository_root / ".codex").exists())
            self.assertFalse((repository_root / ".agents").exists())

    def test_check_accepts_current_checked_in_documents_and_ignores_antigravity(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )
        check_documents = require_setup_callable(
            self,
            "check_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            rendered_documents = render_documents(repository_root)
            for document in rendered_documents:
                path = document.destination_path

                if path.relative_to(repository_root) == Path(
                    ".agents/mcp_config.json"
                ):
                    continue
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(
                    document.rendered_contents,
                    encoding="utf-8",
                    newline="\n",
                )
            local_antigravity = (
                repository_root / ".agents" / "mcp_config.json"
            )
            local_antigravity.parent.mkdir(parents=True, exist_ok=True)
            local_antigravity.write_text("not JSON", encoding="utf-8")

            checked_paths = check_documents(repository_root)

        self.assertEqual(
            [path.relative_to(repository_root).as_posix() for path in checked_paths],
            [".mcp.json", ".codex/config.toml"],
        )


class TransactionalHostConfigurationPublicationTests(unittest.TestCase):
    def test_edit_after_rendering_aborts_without_overwriting_user_content(self):
        render_documents = require_setup_callable(
            self,
            "render_mcp_host_configuration_documents",
        )
        publish_documents = require_setup_callable(
            self,
            "publish_mcp_host_configuration_documents",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            rendered_documents = render_documents(repository_root)
            configuration_path = repository_root / ".mcp.json"
            concurrent_user_contents = json.dumps(
                {
                    "mcpServers": {
                        "user_added_while_setup_was_building": {
                            "command": "independent-server"
                        }
                    }
                },
                indent=2,
            ) + "\n"
            configuration_path.write_text(
                concurrent_user_contents,
                encoding="utf-8",
            )

            with mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ), self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "changed after.*rendered|rendered.*changed",
            ):
                publish_documents(repository_root, rendered_documents)

            self.assertEqual(
                configuration_path.read_text(encoding="utf-8"),
                concurrent_user_contents,
            )
            self.assertFalse(
                (repository_root / ".codex" / "config.toml").exists()
            )
            self.assertFalse(
                (repository_root / ".agents" / "mcp_config.json").exists()
            )

    def test_existing_destination_remains_present_until_atomic_replacement(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "configuration.json"
            staged_replacement = root / ".configuration.json.staged.tmp"
            destination.write_bytes(b"original")
            staged_replacement.write_bytes(b"replacement")
            real_replace = os.replace

            def observe_continuous_destination(source, target):
                source_path = Path(source)
                target_path = Path(target)

                self.assertNotEqual(
                    source_path,
                    destination,
                    "the live destination must not be renamed away",
                )

                if target_path == destination:
                    self.assertTrue(destination.exists())
                    self.assertEqual(destination.read_bytes(), b"original")

                return real_replace(source, target)

            with mock.patch.object(
                set_up_mcp_servers.os,
                "replace",
                side_effect=observe_continuous_destination,
            ):
                activated_paths = activate_replacements(
                    root,
                    [(destination, staged_replacement)]
                )

            self.assertEqual(activated_paths, [destination])
            self.assertEqual(destination.read_bytes(), b"replacement")

    def test_native_replacement_retains_the_exact_displaced_file(self):
        replace_existing_file = require_setup_callable(
            self,
            "_replace_existing_file_and_retain_displaced_file",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "configuration.json"
            staged_replacement = root / ".configuration.json.staged.tmp"
            displaced_file = root / ".configuration.json.activation.backup"
            destination.write_bytes(b"live before replacement")
            staged_replacement.write_bytes(b"managed replacement")
            displaced_file.write_bytes(b"")

            replace_existing_file(
                destination,
                staged_replacement,
                displaced_file,
            )

            self.assertEqual(destination.read_bytes(), b"managed replacement")
            self.assertEqual(displaced_file.read_bytes(), b"live before replacement")
            self.assertFalse(staged_replacement.exists())

    def test_edit_at_guarded_replacement_boundary_is_restored_from_displaced_file(
        self,
    ):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )
        replace_existing_file = require_setup_callable(
            self,
            "_replace_existing_file_and_retain_displaced_file",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "configuration.json"
            staged_replacement = root / ".configuration.json.staged.tmp"
            destination.write_bytes(b"render-time observation")
            staged_replacement.write_bytes(b"managed replacement")
            concurrent_user_contents = b"edit at the replacement boundary"

            def replace_after_concurrent_edit(
                destination_path,
                staged_replacement_path,
                displaced_file_path,
            ):
                # Model a save in the former check/replace window. The native
                # primitive must retain these exact bytes rather than discard
                # them when it publishes the staged replacement.
                destination_path.write_bytes(concurrent_user_contents)
                replace_existing_file(
                    destination_path,
                    staged_replacement_path,
                    displaced_file_path,
                )

            with mock.patch.object(
                set_up_mcp_servers,
                "_replace_existing_file_and_retain_displaced_file",
                side_effect=replace_after_concurrent_edit,
            ), mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    r"displaced.*rendered|rendered.*displaced",
                ):
                    activate_replacements(
                        root,
                        [(destination, staged_replacement)],
                        expected_destination_bytes_by_path={
                            destination: b"render-time observation"
                        },
                        sensitive_host_configuration_destination_paths={
                            destination
                        },
                    )

            self.assertEqual(destination.read_bytes(), concurrent_user_contents)
            self.assertEqual(
                [path for path in root.iterdir() if path.is_file()],
                [destination],
            )

    def test_missing_guarded_destination_is_published_without_overwriting_a_race(
        self,
    ):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "configuration.json"
            staged_replacement = root / ".configuration.json.staged.tmp"
            staged_replacement.write_bytes(b"managed replacement")
            concurrent_user_contents = b"created at the publication boundary"
            real_link = os.link

            def create_destination_then_link(source, target, **options):
                destination.write_bytes(concurrent_user_contents)
                return real_link(source, target, **options)

            with mock.patch.object(
                set_up_mcp_servers.os,
                "link",
                side_effect=create_destination_then_link,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    r"changed after.*rendered|rendered.*changed",
                ):
                    activate_replacements(
                        root,
                        [(destination, staged_replacement)],
                        expected_destination_bytes_by_path={destination: None},
                    )

            self.assertEqual(destination.read_bytes(), concurrent_user_contents)
            self.assertFalse(staged_replacement.exists())

    def test_rollback_preserves_a_concurrent_edit_to_an_activated_destination(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            first_destination = repository_root / "first.json"
            second_destination = repository_root / "second.json"
            first_staged_replacement = repository_root / "first.staged.tmp"
            second_staged_replacement = repository_root / "second.staged.tmp"
            first_destination.write_bytes(b"first original")
            second_destination.write_bytes(b"second original")
            first_staged_replacement.write_bytes(b"first managed")
            second_staged_replacement.write_bytes(b"second managed")
            concurrent_user_contents = b"first edited after activation"
            real_replace = os.replace

            def edit_first_destination_then_fail_second(source, destination):
                source_path = Path(source)
                destination_path = Path(destination)

                if (
                    source_path == second_staged_replacement
                    and destination_path == second_destination
                ):
                    first_destination.write_bytes(concurrent_user_contents)
                    raise PermissionError("simulated later activation failure")

                return real_replace(source, destination)

            with mock.patch.object(
                set_up_mcp_servers.os,
                "replace",
                side_effect=edit_first_destination_then_fail_second,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "preserved concurrent destination change",
                ):
                    activate_replacements(
                        repository_root,
                        [
                            (first_destination, first_staged_replacement),
                            (second_destination, second_staged_replacement),
                        ],
                    )

            self.assertEqual(
                first_destination.read_bytes(),
                concurrent_user_contents,
            )
            self.assertEqual(second_destination.read_bytes(), b"second original")
            recovery_backups = list(
                repository_root.glob(".*.activation.backup")
            )
            self.assertEqual(len(recovery_backups), 1)
            self.assertEqual(recovery_backups[0].read_bytes(), b"first original")

    def test_host_document_staging_requires_exact_git_ignore_coverage(self):
        stage_document = require_setup_callable(
            self,
            "_stage_host_configuration_document",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            destination = repository_root / ".agents" / "mcp_config.json"
            destination.parent.mkdir(parents=True)
            credential_bearing_contents = '{"token":"sensitive"}\n'

            with mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=False,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "transaction artifact.*not ignored|not ignored.*transaction artifact",
                ):
                    stage_document(
                        repository_root,
                        destination,
                        credential_bearing_contents,
                    )

            remaining_files = [
                path for path in repository_root.rglob("*") if path.is_file()
            ]
            self.assertEqual(remaining_files, [])

    def test_host_document_backup_requires_exact_git_ignore_coverage(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            destination = repository_root / ".agents" / "mcp_config.json"
            staged_replacement = repository_root / "staged-configuration.json"
            destination.parent.mkdir(parents=True)
            destination.write_bytes(b"credential-bearing original")
            staged_replacement.write_bytes(b"managed replacement")

            with mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=False,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "transaction artifact.*not ignored|not ignored.*transaction artifact",
                ):
                    activate_replacements(
                        repository_root,
                        [(destination, staged_replacement)],
                        sensitive_host_configuration_destination_paths={
                            destination
                        },
                    )

            self.assertEqual(
                destination.read_bytes(),
                b"credential-bearing original",
            )
            self.assertFalse(staged_replacement.exists())
            self.assertEqual(
                [
                    path
                    for path in destination.parent.iterdir()
                    if path != destination
                ],
                [],
            )

    def test_edit_during_earlier_activation_is_not_overwritten(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            program_path = root / "program.mjs"
            staged_program_path = root / ".program.mjs.staged.tmp"
            configuration_path = root / "configuration.json"
            staged_configuration_path = root / ".configuration.json.staged.tmp"
            program_path.write_bytes(b"old program")
            staged_program_path.write_bytes(b"new program")
            configuration_path.write_bytes(b"original configuration")
            staged_configuration_path.write_bytes(b"managed configuration")
            concurrent_user_contents = b"user edit during activation"
            real_replace = os.replace

            def edit_configuration_after_program_replacement(source, destination):
                replacement_result = real_replace(source, destination)

                if (
                    Path(source) == staged_program_path
                    and Path(destination) == program_path
                ):
                    configuration_path.write_bytes(concurrent_user_contents)

                return replacement_result

            with mock.patch.object(
                set_up_mcp_servers.os,
                "replace",
                side_effect=edit_configuration_after_program_replacement,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "changed after.*rendered|rendered.*changed",
                ):
                    activate_replacements(
                        root,
                        [
                            (program_path, staged_program_path),
                            (
                                configuration_path,
                                staged_configuration_path,
                            ),
                        ],
                        expected_destination_bytes_by_path={
                            configuration_path: b"original configuration"
                        },
                    )

            self.assertEqual(program_path.read_bytes(), b"old program")
            self.assertEqual(
                configuration_path.read_bytes(),
                concurrent_user_contents,
            )

    def test_later_replacement_failure_restores_every_original_document(self):
        publish_documents = require_setup_callable(
            self,
            "publish_mcp_host_configuration_documents",
        )
        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            first_path = repository_root / ".mcp.json"
            second_path = repository_root / ".codex" / "config.toml"
            first_path.parent.mkdir(parents=True, exist_ok=True)
            second_path.parent.mkdir(parents=True)
            first_path.write_text("first-original\n", encoding="utf-8")
            second_path.write_text("second-original\n", encoding="utf-8")
            first_observed_bytes = first_path.read_bytes()
            second_observed_bytes = second_path.read_bytes()
            replace_existing_file = (
                set_up_mcp_servers._replace_existing_file_and_retain_displaced_file
            )
            destination_replacements = 0

            def fail_second_destination_replacement(
                destination,
                staged_replacement,
                displaced_file,
            ):
                nonlocal destination_replacements
                destination_replacements += 1

                if destination_replacements == 2:
                    raise PermissionError("simulated locked configuration")

                return replace_existing_file(
                    destination,
                    staged_replacement,
                    displaced_file,
                )

            with mock.patch.object(
                set_up_mcp_servers,
                "_replace_existing_file_and_retain_displaced_file",
                side_effect=fail_second_destination_replacement,
            ), mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "simulated locked configuration",
                ):
                    publish_documents(
                        repository_root,
                        [
                            rendered_mcp_host_configuration_document(
                                first_path,
                                "first-new\n",
                                first_observed_bytes,
                            ),
                            rendered_mcp_host_configuration_document(
                                second_path,
                                "second-new\n",
                                second_observed_bytes,
                            ),
                        ]
                    )

            self.assertEqual(
                first_path.read_text(encoding="utf-8"),
                "first-original\n",
            )
            self.assertEqual(
                second_path.read_text(encoding="utf-8"),
                "second-original\n",
            )
            remnants = [
                path
                for path in repository_root.rglob("*")
                if path.is_file() and path not in {first_path, second_path}
            ]
            self.assertEqual(remnants, [])

    def test_partial_staging_failure_removes_every_temporary_document(self):
        publish_documents = require_setup_callable(
            self,
            "publish_mcp_host_configuration_documents",
        )
        stage_document = require_setup_callable(
            self,
            "_stage_host_configuration_document",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            first_path = repository_root / ".mcp.json"
            second_path = repository_root / ".codex" / "config.toml"
            staging_attempt_count = 0

            def fail_second_staging_attempt(
                staging_repository_root,
                path,
                contents,
            ):
                nonlocal staging_attempt_count
                staging_attempt_count += 1

                if staging_attempt_count == 2:
                    raise OSError("simulated staging failure")

                return stage_document(
                    staging_repository_root,
                    path,
                    contents,
                )

            with mock.patch.object(
                set_up_mcp_servers,
                "_stage_host_configuration_document",
                side_effect=fail_second_staging_attempt,
            ), mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "simulated staging failure",
                ):
                    publish_documents(
                        repository_root,
                        [
                            rendered_mcp_host_configuration_document(
                                first_path,
                                "first-new\n",
                                None,
                            ),
                            rendered_mcp_host_configuration_document(
                                second_path,
                                "second-new\n",
                                None,
                            ),
                        ]
                    )

            self.assertFalse(first_path.exists())
            self.assertFalse(second_path.exists())
            self.assertEqual(
                [path for path in repository_root.rglob("*") if path.is_file()],
                [],
            )

    def test_failed_rollback_preserves_the_only_recovery_copy(self):
        publish_documents = require_setup_callable(
            self,
            "publish_mcp_host_configuration_documents",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            first_configuration_path = repository_root / "first.json"
            second_configuration_path = repository_root / "second.json"
            first_configuration_path.write_text("first-original\n", encoding="utf-8")
            second_configuration_path.write_text(
                "second-original\n",
                encoding="utf-8",
            )
            first_observed_bytes = first_configuration_path.read_bytes()
            second_observed_bytes = second_configuration_path.read_bytes()
            real_replace = os.replace
            replace_existing_file = (
                set_up_mcp_servers._replace_existing_file_and_retain_displaced_file
            )

            def fail_second_activation(
                destination,
                staged_replacement,
                displaced_file,
            ):
                if Path(destination) == second_configuration_path:
                    raise PermissionError("simulated activation failure")

                return replace_existing_file(
                    destination,
                    staged_replacement,
                    displaced_file,
                )

            def fail_rollback(source, destination):
                source_path = Path(source)
                destination_path = Path(destination)

                if (
                    destination_path == first_configuration_path
                    and source_path.name.endswith(".activation.backup")
                ):
                    raise PermissionError("simulated rollback failure")

                return real_replace(source, destination)

            with mock.patch.object(
                set_up_mcp_servers,
                "_replace_existing_file_and_retain_displaced_file",
                side_effect=fail_second_activation,
            ), mock.patch.object(
                set_up_mcp_servers.os,
                "replace",
                side_effect=fail_rollback,
            ), mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "preserved recovery backup",
                ):
                    publish_documents(
                        repository_root,
                        [
                            rendered_mcp_host_configuration_document(
                                first_configuration_path,
                                "first-replacement\n",
                                first_observed_bytes,
                            ),
                            rendered_mcp_host_configuration_document(
                                second_configuration_path,
                                "second-replacement\n",
                                second_observed_bytes,
                            ),
                        ]
                    )

            recovery_backups = list(
                repository_root.glob(".*.activation.backup")
            )
            self.assertEqual(len(recovery_backups), 1)
            self.assertEqual(
                recovery_backups[0].read_text(encoding="utf-8"),
                "first-original\n",
            )
            self.assertEqual(
                first_configuration_path.read_text(encoding="utf-8"),
                "first-replacement\n",
            )
            self.assertEqual(
                second_configuration_path.read_text(encoding="utf-8"),
                "second-original\n",
            )

    def test_superseded_backup_cleanup_denial_is_nonfatal_and_reported(
        self,
    ):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "github-mcp-server.exe"
            temporary_path = root / ".github-mcp-server.exe.staged.tmp"
            destination.write_bytes(b"running executable")
            temporary_path.write_bytes(b"replacement executable")
            real_unlink = Path.unlink
            cleanup_denied_backup_paths: list[Path] = []

            def reject_locked_backup_cleanup(path, *, missing_ok=False):
                if (
                    path.name.endswith(".backup")
                    and path.exists()
                    and path.read_bytes() == b"running executable"
                ):
                    cleanup_denied_backup_paths.append(path)
                    raise PermissionError("simulated scanner retention")

                return real_unlink(path, missing_ok=missing_ok)

            standard_error = io.StringIO()
            with mock.patch.object(
                Path,
                "unlink",
                autospec=True,
                side_effect=reject_locked_backup_cleanup,
            ), contextlib.redirect_stderr(standard_error):
                activated_paths = activate_replacements(
                    root,
                    [(destination, temporary_path)]
                )

            self.assertEqual(activated_paths, [destination])
            self.assertEqual(destination.read_bytes(), b"replacement executable")
            self.assertEqual(len(cleanup_denied_backup_paths), 1)
            self.assertEqual(
                cleanup_denied_backup_paths[0].read_bytes(),
                b"running executable",
            )
            self.assertIn(
                str(cleanup_denied_backup_paths[0]),
                standard_error.getvalue(),
            )
            self.assertIn("superseded backup", standard_error.getvalue())

    @unittest.skipUnless(os.name == "posix", "POSIX execution permissions required")
    def test_matching_bytes_with_repaired_execution_permissions_are_activated(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "github-mcp-server"
            temporary_path = root / ".github-mcp-server.staged.tmp"
            destination.write_bytes(b"identical executable")
            temporary_path.write_bytes(b"identical executable")
            destination.chmod(0o600)
            temporary_path.chmod(0o700)

            activated_paths = activate_replacements(
                root,
                [(destination, temporary_path)]
            )

            self.assertEqual(activated_paths, [destination])
            self.assertTrue(destination.stat().st_mode & stat.S_IXUSR)

    def test_preparation_failure_removes_every_staged_replacement(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "destination"
            destination.write_bytes(b"original")
            first_temporary_path = root / "first.tmp"
            second_temporary_path = root / "second.tmp"
            first_temporary_path.write_bytes(b"first")
            second_temporary_path.write_bytes(b"second")

            with mock.patch.object(
                set_up_mcp_servers,
                "_files_have_identical_bytes",
                side_effect=OSError("simulated preparation failure"),
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "simulated preparation failure",
                ):
                    activate_replacements(
                        root,
                        [
                            (destination, first_temporary_path),
                            (root / "second-destination", second_temporary_path),
                        ]
                    )

            self.assertEqual(destination.read_bytes(), b"original")
            self.assertFalse(first_temporary_path.exists())
            self.assertFalse(second_temporary_path.exists())

    def test_duplicate_destination_is_rejected_before_any_activation(self):
        activate_replacements = require_setup_callable(
            self,
            "_activate_staged_file_replacements",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            destination = root / "destination"
            destination.write_bytes(b"original")
            first_temporary_path = root / "first.tmp"
            second_temporary_path = root / "second.tmp"
            first_temporary_path.write_bytes(b"first")
            second_temporary_path.write_bytes(b"second")

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "duplicate replacement destination",
            ):
                activate_replacements(
                    root,
                    [
                        (destination, first_temporary_path),
                        (destination, second_temporary_path),
                    ]
                )

            self.assertEqual(destination.read_bytes(), b"original")
            self.assertFalse(first_temporary_path.exists())
            self.assertFalse(second_temporary_path.exists())


class GeneratedMcpInstallationStateTests(unittest.TestCase):
    def test_downloaded_binary_and_install_record_are_ignored_by_git(self):
        generated_paths = (
            ".agent-tools/bin/github-mcp-server.exe",
            ".agent-tools/github-mcp-server/installation.json",
            ".agent-tools/bin/universal-ontology-mcp-server.mjs",
            ".agent-tools/universal-ontology-mcp-server/installation.json",
        )

        for generated_path in generated_paths:
            with self.subTest(generated_path=generated_path):
                result = subprocess.run(
                    [
                        "git",
                        "-C",
                        str(REPOSITORY_ROOT),
                        "check-ignore",
                        "--quiet",
                        "--no-index",
                        "--",
                        generated_path,
                    ],
                    check=False,
                )

                self.assertEqual(
                    result.returncode,
                    0,
                    f"Expected Git to ignore generated path: {generated_path}",
                )

    def test_configuration_transaction_artifacts_are_ignored_exactly(self):
        ignored_transaction_paths = (
            ".mcp.json.repository-mcp-setup.abcdef.staged.tmp",
            ".mcp.json.repository-mcp-setup.abcdef.activation.backup",
            ".codex/.config.toml.repository-mcp-setup.abcdef.staged.tmp",
            ".codex/.config.toml.repository-mcp-setup.abcdef.activation.backup",
            ".agents/.mcp_config.json.repository-mcp-setup.abcdef.staged.tmp",
            ".agents/.mcp_config.json.repository-mcp-setup.abcdef.activation.backup",
        )

        for transaction_path in ignored_transaction_paths:
            with self.subTest(transaction_path=transaction_path):
                result = subprocess.run(
                    [
                        "git",
                        "-C",
                        str(REPOSITORY_ROOT),
                        "check-ignore",
                        "--quiet",
                        "--no-index",
                        "--",
                        transaction_path,
                    ],
                    check=False,
                )
                self.assertEqual(
                    result.returncode,
                    0,
                    f"Expected Git to ignore transaction path: {transaction_path}",
                )

        nested_unrelated_generated_path = (
            "packages/example/.agent-tools/user-owned-file"
        )
        nested_result = subprocess.run(
            [
                "git",
                "-C",
                str(REPOSITORY_ROOT),
                "check-ignore",
                "--quiet",
                "--no-index",
                "--",
                nested_unrelated_generated_path,
            ],
            check=False,
        )
        self.assertEqual(
            nested_result.returncode,
            1,
            "The repository-root installation rule must not hide nested paths.",
        )

    def test_generated_installation_root_must_be_ignored(self):
        ensure_safe_root = require_setup_callable(
            self,
            "ensure_generated_installation_root_is_safe",
        )
        git = shutil.which("git")
        self.assertIsNotNone(git, "Git is required by this repository")

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            subprocess.run(
                [git, "init", "--quiet", str(repository_root)],
                check=True,
                text=True,
                capture_output=True,
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"\.agent-tools.*not ignored|not ignored.*\.agent-tools",
            ):
                ensure_safe_root(repository_root)

    def test_generated_installation_root_must_not_contain_tracked_files(self):
        ensure_safe_root = require_setup_callable(
            self,
            "ensure_generated_installation_root_is_safe",
        )
        git = shutil.which("git")
        self.assertIsNotNone(git, "Git is required by this repository")

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            subprocess.run(
                [git, "init", "--quiet", str(repository_root)],
                check=True,
                text=True,
                capture_output=True,
            )
            (repository_root / ".gitignore").write_text(
                ".agent-tools/\n",
                encoding="utf-8",
            )
            tracked_path = (
                repository_root
                / ".agent-tools"
                / "bin"
                / "universal-ontology-mcp-server.mjs"
            )
            tracked_path.parent.mkdir(parents=True)
            tracked_path.write_text("tracked", encoding="utf-8")
            subprocess.run(
                [
                    git,
                    "-C",
                    str(repository_root),
                    "add",
                    "--force",
                    "--",
                    str(tracked_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"tracks files beneath.*\.agent-tools",
            ):
                ensure_safe_root(repository_root)

    def test_generated_installation_root_is_accepted_when_ignored_and_untracked(self):
        ensure_safe_root = require_setup_callable(
            self,
            "ensure_generated_installation_root_is_safe",
        )
        git = shutil.which("git")
        self.assertIsNotNone(git, "Git is required by this repository")

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            subprocess.run(
                [git, "init", "--quiet", str(repository_root)],
                check=True,
                text=True,
                capture_output=True,
            )
            (repository_root / ".gitignore").write_text(
                ".agent-tools/\n",
                encoding="utf-8",
            )

            ensure_safe_root(repository_root)

    def test_generated_installation_root_must_be_a_directory_when_present(self):
        ensure_safe_root = require_setup_callable(
            self,
            "ensure_generated_installation_root_is_safe",
        )
        git = shutil.which("git")
        self.assertIsNotNone(git, "Git is required by this repository")

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            subprocess.run(
                [git, "init", "--quiet", str(repository_root)],
                check=True,
                text=True,
                capture_output=True,
            )
            (repository_root / ".gitignore").write_text(
                ".agent-tools/\n",
                encoding="utf-8",
            )
            (repository_root / ".agent-tools").write_text(
                "not a directory",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"\.agent-tools.*directory|directory.*\.agent-tools",
            ):
                ensure_safe_root(repository_root)


class SetupCommandLineTests(unittest.TestCase):
    def test_http_source_selection_reaches_the_transactional_installer(self):
        setup_result = set_up_mcp_servers.RepositoryLocalMcpSetupResult(
            github_mcp_server_version="github-mcp-server Version: v1.11.0",
            universal_ontology_mcp_verification={
                "ontologyQueryArtifactSourceKind": "http",
                "toolNames": ["search_entities", "resolve_entity"],
            },
            activated_paths=(),
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "derive_repo_from_script",
            return_value=REPOSITORY_ROOT,
        ), mock.patch.object(
            set_up_mcp_servers,
            "set_up_repository_local_mcp_servers",
            return_value=setup_result,
        ) as install_servers:
            exit_code = set_up_mcp_servers.main(
                [
                    "--universal-ontology-query-artifact-source=http",
                    "--universal-ontology-query-artifact-channel=stable",
                    (
                        "--universal-ontology-query-artifact-base-url="
                        "https://example.cloudfront.net/ontology/query/v1/"
                    ),
                ]
            )

        self.assertEqual(exit_code, 0)
        install_servers.assert_called_once_with(
            REPOSITORY_ROOT,
            query_artifact_source_kind="http",
            query_artifact_channel_name="stable",
            query_artifact_base_url=(
                "https://example.cloudfront.net/ontology/query/v1/"
            ),
        )

    def test_check_mode_bypasses_installation_and_performs_only_drift_check(self):
        main = set_up_mcp_servers.main
        self.assertIn("arguments", inspect.signature(main).parameters)

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            with mock.patch.object(
                set_up_mcp_servers,
                "derive_repo_from_script",
                return_value=repository_root,
            ), mock.patch.object(
                set_up_mcp_servers,
                "check_mcp_host_configuration_documents",
                return_value=[
                    repository_root / ".mcp.json",
                    repository_root / ".codex" / "config.toml",
                ],
            ) as check_documents, mock.patch.object(
                set_up_mcp_servers,
                "set_up_repository_local_mcp_servers",
                side_effect=AssertionError("check mode entered the installer"),
            ) as install_servers:
                exit_code = main(
                    [
                        "--check",
                        "--universal-ontology-query-artifact-source=http",
                        "--universal-ontology-query-artifact-channel=stable",
                        (
                            "--universal-ontology-query-artifact-base-url="
                            "https://example.cloudfront.net/ontology/query/v1/"
                        ),
                    ]
                )

        self.assertEqual(exit_code, 0)
        check_documents.assert_called_once_with(
            repository_root,
            query_artifact_source_kind="http",
            query_artifact_channel_name="stable",
            query_artifact_base_url=(
                "https://example.cloudfront.net/ontology/query/v1/"
            ),
        )
        install_servers.assert_not_called()

    def test_help_starts_through_repository_shipped_dependencies(self):
        result = subprocess.run(
            [
                sys.executable,
                str(REPOSITORY_ROOT / "scripts" / "set_up_mcp_servers.py"),
                "--help",
            ],
            cwd=REPOSITORY_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--check", result.stdout)

    def test_setup_reports_token_precedence_without_disclosing_the_token(self):
        repository_root = REPOSITORY_ROOT
        sensitive_token = "secret-token-that-must-not-be-printed"
        standard_output = io.StringIO()
        setup_result_type = getattr(
            set_up_mcp_servers,
            "RepositoryLocalMcpSetupResult",
            None,
        )
        self.assertIsNotNone(setup_result_type)
        setup_result = setup_result_type(
            github_mcp_server_version="github-mcp-server Version: v1.11.0",
            universal_ontology_mcp_verification={
                "ontologyQueryArtifactChannelName": "development",
                "toolNames": ["search_entities", "resolve_entity"],
            },
            activated_paths=(repository_root / ".mcp.json",),
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "derive_repo_from_script",
            return_value=repository_root,
        ), mock.patch.object(
            set_up_mcp_servers,
            "set_up_repository_local_mcp_servers",
            return_value=setup_result,
        ), mock.patch.dict(
            os.environ,
            {"GITHUB_PERSONAL_ACCESS_TOKEN": sensitive_token},
            clear=True,
        ), contextlib.redirect_stdout(standard_output):
            exit_code = set_up_mcp_servers.main([])

        output = standard_output.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("GITHUB_PERSONAL_ACCESS_TOKEN", output)
        self.assertIn("takes precedence over browser-based OAuth", output)
        self.assertNotIn(sensitive_token, output)


class UniversalOntologyMcpInstallationTests(unittest.TestCase):
    def test_generates_repository_local_query_artifacts_with_the_declared_npm(self):
        generate_query_artifacts = require_setup_callable(
            self,
            "generate_repository_local_ontology_query_artifacts",
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "require_command",
            return_value="npx-path",
            create=True,
        ), mock.patch.object(
            set_up_mcp_servers,
            "_read_declared_npm_version",
            return_value="12.0.2",
        ), mock.patch.object(
            set_up_mcp_servers,
            "run",
            create=True,
        ) as run_command:
            generate_query_artifacts(REPOSITORY_ROOT)

        run_command.assert_called_once_with(
            [
                "npx-path",
                "--yes",
                "npm@12.0.2",
                "run",
                "mcp:index",
            ],
            cwd=REPOSITORY_ROOT,
        )

    def test_package_identity_reader_rejects_a_different_package_name(self):
        read_package_identity = require_setup_callable(
            self,
            "read_universal_ontology_mcp_package_identity",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            package_manifest_path = (
                repository_root
                / "packages"
                / "universal-ontology-mcp-server"
                / "package.json"
            )
            package_manifest_path.parent.mkdir(parents=True)
            package_manifest_path.write_text(
                json.dumps(
                    {
                        "name": "lookalike-ontology-server",
                        "version": "1.0.0",
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "package name.*universal-ontology-mcp-server",
            ):
                read_package_identity(repository_root)

    def test_build_uses_the_exact_declared_npm_and_validates_bundle_metadata(self):
        build_application_bundle = require_setup_callable(
            self,
            "build_universal_ontology_mcp_application_bundle",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            (repository_root / "package.json").write_text(
                json.dumps(
                    {
                        "name": "universal-ontology",
                        "version": "1.0.0",
                        "packageManager": "npm@12.0.2",
                    }
                ),
                encoding="utf-8",
            )
            bundle_path = (
                repository_root
                / "packages"
                / "universal-ontology-mcp-server"
                / "dist"
                / "universal-ontology-mcp-server.mjs"
            )
            package_manifest_path = bundle_path.parents[1] / "package.json"
            package_manifest_path.parent.mkdir(parents=True)
            package_manifest_path.write_text(
                json.dumps(
                    {
                        "name": "universal-ontology-mcp-server",
                        "version": "1.0.0",
                    }
                ),
                encoding="utf-8",
            )
            metadata_path = (
                repository_root
                / "dist"
                / "release-work"
                / "universal-ontology-mcp-application-bundle.json"
            )
            observed_commands = []
            expected_bundle_sha256 = hashlib.sha256(
                b"#!/usr/bin/env node\n// staged bundle\n"
            ).hexdigest()

            def run_command(arguments, **options):
                command = [str(argument) for argument in arguments]
                observed_commands.append((command, options))

                if command[-1] == "--version" and command[0] == "node-path":
                    return subprocess.CompletedProcess(command, 0, "v24.20.0\n", "")

                if command[-1] == "--version" and "npm@12.0.2" in command:
                    return subprocess.CompletedProcess(command, 0, "12.0.2\n", "")

                if command[-1] == "mcp:package:build":
                    bundle_path.parent.mkdir(parents=True)
                    bundle_bytes = b"#!/usr/bin/env node\n// staged bundle\n"
                    bundle_path.write_bytes(bundle_bytes)
                    metadata_path.parent.mkdir(parents=True)
                    metadata_path.write_text(
                        json.dumps(
                            {
                                "applicationBundleMetadataFormatVersion": 1,
                                "packageName": "universal-ontology-mcp-server",
                                "packageVersion": "1.0.0",
                                "bundleRelativePath": (
                                    "packages/universal-ontology-mcp-server/dist/"
                                    "universal-ontology-mcp-server.mjs"
                                ),
                                "bundleByteLength": len(bundle_bytes),
                                "bundleSha256": hashlib.sha256(
                                    bundle_bytes
                                ).hexdigest(),
                            }
                        ),
                        encoding="utf-8",
                    )

                return subprocess.CompletedProcess(command, 0, "", "")

            with mock.patch.object(
                set_up_mcp_servers,
                "require_command",
                side_effect=lambda name: f"{name}-path",
                create=True,
            ), mock.patch.object(
                set_up_mcp_servers,
                "run",
                side_effect=run_command,
                create=True,
            ):
                built_bundle = build_application_bundle(repository_root)

        self.assertEqual(built_bundle.application_bundle_path, bundle_path)
        self.assertEqual(
            built_bundle.application_bundle_sha256,
            expected_bundle_sha256,
        )
        self.assertEqual(built_bundle.package_name, "universal-ontology-mcp-server")
        self.assertEqual(built_bundle.package_version, "1.0.0")
        commands = [command for command, _options in observed_commands]
        self.assertEqual(
            commands,
            [
                ["node-path", "--version"],
                ["npx-path", "--yes", "npm@12.0.2", "--version"],
                [
                    "npx-path",
                    "--yes",
                    "npm@12.0.2",
                    "ci",
                    "--ignore-scripts",
                ],
                [
                    "npx-path",
                    "--yes",
                    "npm@12.0.2",
                    "run",
                    "mcp:package:build",
                ],
            ],
        )

    def test_staged_installation_record_describes_software_not_data_channel(self):
        stage_installation = require_setup_callable(
            self,
            "stage_universal_ontology_mcp_server_installation",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            repository_root = root / "repository"
            staging_directory = root / "staging"
            repository_root.mkdir()
            staging_directory.mkdir()
            built_bundle_path = root / "built-bundle.mjs"
            built_bundle_bytes = b"application bundle"
            built_bundle_path.write_bytes(built_bundle_bytes)
            built_bundle = mock.Mock(
                application_bundle_path=built_bundle_path,
                application_bundle_byte_length=len(built_bundle_bytes),
                application_bundle_sha256=hashlib.sha256(
                    built_bundle_bytes
                ).hexdigest(),
                package_name="universal-ontology-mcp-server",
                package_version="1.0.0",
            )

            with mock.patch.object(
                set_up_mcp_servers,
                "build_universal_ontology_mcp_application_bundle",
                return_value=built_bundle,
            ), mock.patch.object(
                set_up_mcp_servers,
                "git_output",
                side_effect=["abc123", " M src/example.js"],
                create=True,
            ):
                staged_installation = stage_installation(
                    repository_root,
                    staging_directory,
                )

            installation_record = json.loads(
                staged_installation.staged_installation_record_path.read_text(
                    encoding="utf-8"
                )
            )

        self.assertEqual(
            staged_installation.installed_program_path,
            repository_root
            / ".agent-tools"
            / "bin"
            / "universal-ontology-mcp-server.mjs",
        )
        self.assertEqual(
            staged_installation.installed_installation_record_path,
            repository_root
            / ".agent-tools"
            / "universal-ontology-mcp-server"
            / "installation.json",
        )
        self.assertEqual(
            installation_record,
            {
                "installationRecordFormatVersion": 1,
                "packageName": "universal-ontology-mcp-server",
                "packageVersion": "1.0.0",
                "applicationBundleByteLength": len(built_bundle_bytes),
                "applicationBundleSha256": hashlib.sha256(
                    built_bundle_bytes
                ).hexdigest(),
                "installedApplicationBundleRelativePath": (
                    ".agent-tools/bin/universal-ontology-mcp-server.mjs"
                ),
                "sourceGitHeadCommit": "abc123",
                "sourceGitWorktreeState": "modified",
            },
        )
        self.assertNotIn("artifactChannel", installation_record)
        self.assertNotIn("ontologyQueryArtifactChannelName", installation_record)

    def test_rejects_a_staged_copy_that_differs_from_the_validated_bundle(self):
        """A concurrent canonical replacement must not falsify the record."""
        stage_installation = require_setup_callable(
            self,
            "stage_universal_ontology_mcp_server_installation",
        )
        validated_bundle_bytes = b"trusted"
        replacement_bundle_bytes = b"altered"

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            repository_root = root / "repository"
            staging_directory = root / "staging"
            repository_root.mkdir()
            staging_directory.mkdir()
            built_bundle_path = root / "built-bundle.mjs"
            built_bundle_path.write_bytes(validated_bundle_bytes)
            built_bundle = mock.Mock(
                application_bundle_path=built_bundle_path,
                application_bundle_byte_length=len(validated_bundle_bytes),
                application_bundle_sha256=hashlib.sha256(
                    validated_bundle_bytes
                ).hexdigest(),
                package_name="universal-ontology-mcp-server",
                package_version="1.0.0",
            )
            actual_copy2 = shutil.copy2

            def replace_canonical_bundle_then_copy(source, destination):
                built_bundle_path.write_bytes(replacement_bundle_bytes)
                return actual_copy2(source, destination)

            with mock.patch.object(
                set_up_mcp_servers,
                "build_universal_ontology_mcp_application_bundle",
                return_value=built_bundle,
            ), mock.patch.object(
                set_up_mcp_servers.shutil,
                "copy2",
                side_effect=replace_canonical_bundle_then_copy,
            ), mock.patch.object(
                set_up_mcp_servers,
                "git_output",
                side_effect=["abc123", ""],
                create=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    r"staged.*validated|validated.*staged",
                ):
                    stage_installation(repository_root, staging_directory)

    def test_staged_bundle_verification_invokes_the_official_client_verifier(self):
        verify_installation = require_setup_callable(
            self,
            "verify_staged_universal_ontology_mcp_server_installation",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            package_manifest_path = (
                repository_root
                / "packages"
                / "universal-ontology-mcp-server"
                / "package.json"
            )
            package_manifest_path.parent.mkdir(parents=True)
            package_manifest_path.write_text(
                json.dumps(
                    {
                        "name": "universal-ontology-mcp-server",
                        "version": "1.0.0",
                    }
                ),
                encoding="utf-8",
            )
            staged_program_path = repository_root / "staged-server.mjs"
            staged_program_path.write_text("bundle", encoding="utf-8")
            staged_installation = mock.Mock(
                staged_program_path=staged_program_path,
            )
            setup_script_directory_path = repository_root / "automation"
            completed = subprocess.CompletedProcess(
                [],
                0,
                json.dumps(
                    {
                        "ontologyQueryArtifactSourceKind": "file_system",
                        "queryReadiness": {
                            "matchedEntityIri": (
                                "https://haddenindustries.com/ontology/"
                                "universal/core/Person"
                            ),
                            "outcome": "success",
                        },
                        "serverInfo": {
                            "name": "universal-ontology",
                            "title": "Universal Ontology",
                            "version": "1.0.0",
                        },
                        "toolNames": ["search_entities", "resolve_entity"],
                    }
                )
                + "\n",
                "",
            )

            with mock.patch.object(
                set_up_mcp_servers,
                "require_command",
                return_value="node-path",
                create=True,
            ), mock.patch.object(
                set_up_mcp_servers,
                "SETUP_SCRIPT_PATH",
                setup_script_directory_path / "set_up_mcp_servers.py",
                create=True,
            ), mock.patch.object(
                set_up_mcp_servers,
                "run",
                return_value=completed,
                create=True,
            ) as run_command:
                verification = verify_installation(
                    repository_root,
                    staged_installation,
                )

        self.assertEqual(
            verification["toolNames"],
            ["search_entities", "resolve_entity"],
        )
        run_command.assert_called_once_with(
            [
                "node-path",
                setup_script_directory_path
                / "verifyUniversalOntologyMcpApplicationBundle.js",
                "--application-bundle",
                staged_program_path,
                "--query-artifact-source=file-system",
                (
                    "--query-artifact-root-directory="
                    f"{(repository_root / 'dist' / 'query' / 'v1').as_posix()}"
                ),
                "--verify-query-readiness",
            ],
            cwd=repository_root,
            capture=True,
            check=False,
        )

    def test_staged_bundle_verification_surfaces_the_verifier_diagnostic(self):
        verify_installation = require_setup_callable(
            self,
            "verify_staged_universal_ontology_mcp_server_installation",
        )
        staged_installation = mock.Mock(
            staged_program_path=Path("staged-server.mjs"),
        )
        completed = subprocess.CompletedProcess(
            [],
            1,
            "",
            (
                "Universal Ontology MCP application-bundle verification failed: "
                "tool surface mismatch.\n"
            ),
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "require_command",
            return_value="node-path",
            create=True,
        ), mock.patch.object(
            set_up_mcp_servers,
            "run",
            return_value=completed,
            create=True,
        ):
            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                r"verifier.*tool surface mismatch",
            ):
                verify_installation(REPOSITORY_ROOT, staged_installation)


class StagedMcpInstallationActivationTests(unittest.TestCase):
    def test_configuration_failure_restores_active_program_and_installation_record(
        self,
    ):
        activate_installations = require_setup_callable(
            self,
            "activate_staged_mcp_server_installations_and_host_configurations",
        )
        staged_installation_type = getattr(
            set_up_mcp_servers,
            "StagedMcpServerInstallation",
            None,
        )
        self.assertIsNotNone(staged_installation_type)

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            staged_program = root / "staging" / "server.mjs"
            staged_record = root / "staging" / "installation.json"
            installed_program = root / ".agent-tools" / "bin" / "server.mjs"
            installed_record = (
                root / ".agent-tools" / "server" / "installation.json"
            )
            configuration_path = root / ".mcp.json"
            for path, contents in (
                (staged_program, b"new-program"),
                (staged_record, b"new-record"),
                (installed_program, b"old-program"),
                (installed_record, b"old-record"),
                (configuration_path, b"old-config"),
            ):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(contents)
            staged_installation = staged_installation_type(
                staged_program_path=staged_program,
                installed_program_path=installed_program,
                staged_installation_record_path=staged_record,
                installed_installation_record_path=installed_record,
            )
            def fail_configuration_activation(
                destination,
                staged_replacement,
                displaced_file,
            ):
                raise PermissionError("simulated configuration lock")

            with mock.patch.object(
                set_up_mcp_servers,
                "_replace_existing_file_and_retain_displaced_file",
                side_effect=fail_configuration_activation,
            ), mock.patch.object(
                set_up_mcp_servers,
                "is_ignored",
                return_value=True,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "simulated configuration lock",
                ):
                    activate_installations(
                        root,
                        [staged_installation],
                        [
                            rendered_mcp_host_configuration_document(
                                configuration_path,
                                "new-config",
                                b"old-config",
                            )
                        ],
                    )

            self.assertEqual(installed_program.read_bytes(), b"old-program")
            self.assertEqual(installed_record.read_bytes(), b"old-record")
            self.assertEqual(configuration_path.read_bytes(), b"old-config")


class GitHubReleaseArtifactIntegrityTests(unittest.TestCase):
    def test_malformed_release_archive_is_reported_as_a_setup_error(self):
        extract_executable = require_setup_callable(
            self,
            "extract_release_archive_executable",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            malformed_archive_path = root / "release.zip"
            malformed_archive_path.write_bytes(b"not a ZIP archive")

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "not a valid GitHub MCP Server release archive",
            ):
                extract_executable(
                    malformed_archive_path,
                    "github-mcp-server.exe",
                    root / "github-mcp-server.exe",
                )

    def test_checksum_manifest_rejects_conflicting_duplicate_asset_names(self):
        parse_manifest = require_setup_callable(
            self,
            "parse_sha256_checksum_manifest",
        )
        first_digest = "a" * 64
        second_digest = "b" * 64

        with self.assertRaisesRegex(
            set_up_mcp_servers.SetupError,
            "conflicting SHA-256 digests",
        ):
            parse_manifest(
                f"{first_digest}  github-mcp-server.zip\n"
                f"{second_digest}  github-mcp-server.zip\n"
            )

    def test_checksum_manifest_accepts_only_sha256_digests(self):
        parse_manifest = require_setup_callable(
            self,
            "parse_sha256_checksum_manifest",
        )
        valid_digest = "A1" * 32

        self.assertEqual(
            parse_manifest(
                "not-a-sha256  malformed.zip\n"
                f"{valid_digest} *valid.zip\n"
            ),
            {"valid.zip": valid_digest.lower()},
        )

    def test_release_archive_requires_one_unambiguous_executable_member(self):
        select_member_name = require_setup_callable(
            self,
            "select_release_archive_executable_member_name",
        )

        with self.assertRaisesRegex(
            set_up_mcp_servers.SetupError,
            "multiple candidate files",
        ):
            select_member_name(
                [
                    "github-mcp-server.exe",
                    "nested/github-mcp-server.exe",
                ],
                "github-mcp-server.exe",
                Path("release.zip"),
            )

    def test_tar_archive_symbolic_link_is_not_accepted_as_the_executable(self):
        extract_executable = require_setup_callable(
            self,
            "extract_release_archive_executable",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            archive_path = root / "release.tar.gz"
            target_path = root / "github-mcp-server"
            symbolic_link = tarfile.TarInfo("github-mcp-server")
            symbolic_link.type = tarfile.SYMTYPE
            symbolic_link.linkname = "different-file"

            with tarfile.open(archive_path, "w:gz") as archive:
                archive.addfile(symbolic_link)

            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "regular file",
            ):
                extract_executable(
                    archive_path,
                    "github-mcp-server",
                    target_path,
                )

            self.assertFalse(target_path.exists())

    def test_archive_member_is_rejected_before_reading_beyond_the_size_bound(self):
        extract_executable = require_setup_callable(
            self,
            "extract_release_archive_executable",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            archive_path = root / "release.zip"
            target_path = root / "github-mcp-server.exe"

            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("github-mcp-server.exe", b"oversized")

            with mock.patch.object(
                set_up_mcp_servers,
                "GITHUB_MCP_EXECUTABLE_MAXIMUM_BYTE_COUNT",
                4,
            ):
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "exceeds the maximum",
                ):
                    extract_executable(
                        archive_path,
                        "github-mcp-server.exe",
                        target_path,
                    )

            self.assertFalse(target_path.exists())

    def test_http_body_without_content_length_is_still_bounded(self):
        fetch_url_bytes = require_setup_callable(
            self,
            "fetch_url_bytes",
        )

        class FakeHttpResponse(io.BytesIO):
            headers = {}

            def __enter__(self):
                return self

            def __exit__(self, _exception_type, _exception, _traceback):
                self.close()

        with mock.patch.object(
            set_up_mcp_servers.urllib.request,
            "urlopen",
            return_value=FakeHttpResponse(b"five!"),
        ):
            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "exceeded the maximum response size",
            ):
                fetch_url_bytes(
                    "https://example.invalid/release",
                    maximum_response_byte_count=4,
                )

    def test_declared_http_body_size_is_rejected_before_the_body_is_read(self):
        fetch_url_bytes = require_setup_callable(
            self,
            "fetch_url_bytes",
        )

        class UnreadableHttpResponse:
            headers = {"Content-Length": "5"}

            def __enter__(self):
                return self

            def __exit__(self, _exception_type, _exception, _traceback):
                return None

            def read(self, _byte_count):
                raise AssertionError("oversized response body must not be read")

        with mock.patch.object(
            set_up_mcp_servers.urllib.request,
            "urlopen",
            return_value=UnreadableHttpResponse(),
        ):
            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "declares 5 bytes",
            ):
                fetch_url_bytes(
                    "https://example.invalid/release",
                    maximum_response_byte_count=4,
                )

    def test_latest_release_metadata_must_be_a_json_object(self):
        resolve_release = require_setup_callable(
            self,
            "resolve_latest_github_mcp_release",
        )

        with mock.patch.object(
            set_up_mcp_servers,
            "fetch_url_bytes",
            return_value=b"not-json",
        ):
            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "release metadata.*valid JSON",
            ):
                resolve_release()

    def test_latest_release_rejects_duplicate_asset_names(self):
        resolve_release = require_setup_callable(
            self,
            "resolve_latest_github_mcp_release",
        )
        release_metadata = {
            "tag_name": "v1.11.0",
            "assets": [
                {
                    "name": "duplicate.zip",
                    "browser_download_url": "https://example.invalid/first",
                },
                {
                    "name": "duplicate.zip",
                    "browser_download_url": "https://example.invalid/second",
                },
            ],
        }

        with mock.patch.object(
            set_up_mcp_servers,
            "fetch_url_bytes",
            return_value=json.dumps(release_metadata).encode("utf-8"),
        ):
            with self.assertRaisesRegex(
                set_up_mcp_servers.SetupError,
                "duplicate asset name",
            ):
                resolve_release()


class GitHubMcpInstallationTests(unittest.TestCase):
    def test_non_utf8_installation_record_is_treated_as_damaged(self):
        read_installation_record = require_setup_callable(
            self,
            "read_installation_record",
        )

        with tempfile.TemporaryDirectory() as scratch:
            installation_record_path = Path(scratch) / "installation.json"
            installation_record_path.write_bytes(b"\xff\xfe\xfd")

            self.assertEqual(
                read_installation_record(installation_record_path),
                {},
            )

    def test_release_is_staged_with_a_semantically_explicit_installation_record(self):
        stage_installation = require_setup_callable(
            self,
            "stage_github_mcp_server_installation",
        )

        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            repository_root = root / "repository"
            staging_directory = root / "staging"
            repository_root.mkdir()
            staging_directory.mkdir()
            executable_bytes = b"verified GitHub MCP executable"

            def extract_candidate(_archive_path, _binary_name, target_path):
                target_path.write_bytes(executable_bytes)

            with mock.patch.object(
                set_up_mcp_servers.platform,
                "system",
                return_value="Windows",
            ), mock.patch.object(
                set_up_mcp_servers.platform,
                "machine",
                return_value="AMD64",
            ), mock.patch.object(
                set_up_mcp_servers,
                "resolve_latest_github_mcp_release",
                return_value=("v1.11.0", {"candidate.zip": "asset-url"}),
            ), mock.patch.object(
                set_up_mcp_servers,
                "download_verified_github_mcp_release_archive",
                return_value=b"release archive",
            ), mock.patch.object(
                set_up_mcp_servers,
                "github_mcp_release_archive_asset_name",
                return_value="candidate.zip",
            ), mock.patch.object(
                set_up_mcp_servers,
                "extract_release_archive_executable",
                side_effect=extract_candidate,
            ):
                staged_installation = stage_installation(
                    repository_root,
                    staging_directory,
                )

            installation_record = json.loads(
                staged_installation.staged_installation_record_path.read_text(
                    encoding="utf-8"
                )
            )

        self.assertFalse(staged_installation.installed_program_path.exists())
        self.assertEqual(
            staged_installation.installed_program_path,
            repository_root / ".agent-tools" / "bin" / "github-mcp-server.exe",
        )
        self.assertEqual(
            staged_installation.installed_installation_record_path,
            repository_root
            / ".agent-tools"
            / "github-mcp-server"
            / "installation.json",
        )
        self.assertEqual(
            installation_record,
            {
                "installationRecordFormatVersion": 1,
                "releaseTag": "v1.11.0",
                "releaseAssetName": "candidate.zip",
                "executableSha256": hashlib.sha256(executable_bytes).hexdigest(),
                "installedExecutableRelativePath": (
                    ".agent-tools/bin/github-mcp-server.exe"
                ),
            },
        )

    def test_staged_executable_is_verified_without_using_the_active_path(self):
        verify_installation = require_setup_callable(
            self,
            "verify_staged_github_mcp_server_installation",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            staged_executable_path = repository_root / "staged-github.exe"
            staged_executable_path.write_bytes(b"executable")
            staged_installation = mock.Mock(
                staged_program_path=staged_executable_path,
            )
            completed = subprocess.CompletedProcess(
                [],
                0,
                "github-mcp-server\nVersion: v1.11.0\n",
                "",
            )

            with mock.patch.object(
                set_up_mcp_servers.subprocess,
                "run",
                return_value=completed,
            ) as run_process:
                reported_version = verify_installation(
                    repository_root,
                    staged_installation,
                )

        self.assertEqual(reported_version, "github-mcp-server Version: v1.11.0")
        run_process.assert_called_once_with(
            [str(staged_executable_path), "--version"],
            cwd=str(repository_root),
            check=False,
            text=True,
            capture_output=True,
        )


class RepositoryLocalMcpSetupTransactionTests(unittest.TestCase):
    def test_verification_failure_activates_nothing_and_publishes_no_configuration(
        self,
    ):
        set_up_servers = require_setup_callable(
            self,
            "set_up_repository_local_mcp_servers",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            original_configuration_path = repository_root / ".mcp.json"
            original_configuration_path.write_text(
                "original configuration",
                encoding="utf-8",
            )
            github_installation = mock.Mock()
            ontology_installation = mock.Mock()

            with mock.patch.object(
                set_up_mcp_servers,
                "ensure_generated_installation_root_is_safe",
            ), mock.patch.object(
                set_up_mcp_servers,
                "render_mcp_host_configuration_documents",
                return_value=[
                    rendered_mcp_host_configuration_document(
                        original_configuration_path,
                        "new configuration\n",
                        b"original configuration",
                    )
                ],
            ), mock.patch.object(
                set_up_mcp_servers,
                "stage_github_mcp_server_installation",
                return_value=github_installation,
            ), mock.patch.object(
                set_up_mcp_servers,
                "stage_universal_ontology_mcp_server_installation",
                return_value=ontology_installation,
            ), mock.patch.object(
                set_up_mcp_servers,
                "generate_repository_local_ontology_query_artifacts",
            ) as generate_query_artifacts, mock.patch.object(
                set_up_mcp_servers,
                "verify_staged_github_mcp_server_installation",
                return_value="GitHub MCP Server v1.11.0",
            ), mock.patch.object(
                set_up_mcp_servers,
                "verify_staged_universal_ontology_mcp_server_installation",
                side_effect=set_up_mcp_servers.SetupError(
                    "ontology verification rejected"
                ),
            ), mock.patch.object(
                set_up_mcp_servers,
                "activate_staged_mcp_server_installations_and_host_configurations",
            ) as activate:
                with self.assertRaisesRegex(
                    set_up_mcp_servers.SetupError,
                    "ontology verification rejected",
                ):
                    set_up_servers(repository_root)

            generate_query_artifacts.assert_called_once_with(repository_root)
            activate.assert_not_called()
            self.assertEqual(
                original_configuration_path.read_text(encoding="utf-8"),
                "original configuration",
            )

    def test_verified_installations_and_rendered_documents_activate_together(self):
        set_up_servers = require_setup_callable(
            self,
            "set_up_repository_local_mcp_servers",
        )

        with tempfile.TemporaryDirectory() as scratch:
            repository_root = Path(scratch)
            rendered_documents = [
                rendered_mcp_host_configuration_document(
                    repository_root / ".mcp.json",
                    "rendered\n",
                    None,
                )
            ]
            github_installation = mock.Mock()
            ontology_installation = mock.Mock()

            with mock.patch.object(
                set_up_mcp_servers,
                "ensure_generated_installation_root_is_safe",
            ) as ensure_safe, mock.patch.object(
                set_up_mcp_servers,
                "render_mcp_host_configuration_documents",
                return_value=rendered_documents,
            ) as render_documents, mock.patch.object(
                set_up_mcp_servers,
                "stage_github_mcp_server_installation",
                return_value=github_installation,
            ) as stage_github, mock.patch.object(
                set_up_mcp_servers,
                "stage_universal_ontology_mcp_server_installation",
                return_value=ontology_installation,
            ) as stage_ontology, mock.patch.object(
                set_up_mcp_servers,
                "verify_staged_github_mcp_server_installation",
                return_value="GitHub MCP Server v1.11.0",
            ) as verify_github, mock.patch.object(
                set_up_mcp_servers,
                "verify_staged_universal_ontology_mcp_server_installation",
                return_value={
                    "ontologyQueryArtifactSourceKind": "http",
                    "toolNames": ["search_entities", "resolve_entity"],
                },
            ) as verify_ontology, mock.patch.object(
                set_up_mcp_servers,
                "activate_staged_mcp_server_installations_and_host_configurations",
                return_value=[
                    document.destination_path
                    for document in rendered_documents
                ],
            ) as activate:
                result = set_up_servers(
                    repository_root,
                    query_artifact_source_kind="http",
                    query_artifact_channel_name="stable",
                    query_artifact_base_url=(
                        "https://example.cloudfront.net/ontology/query/v1/"
                    ),
                )

        self.assertEqual(
            ensure_safe.call_args_list,
            [mock.call(repository_root), mock.call(repository_root)],
        )
        render_documents.assert_called_once_with(
            repository_root,
            query_artifact_source_kind="http",
            query_artifact_channel_name="stable",
            query_artifact_base_url=(
                "https://example.cloudfront.net/ontology/query/v1/"
            ),
        )
        stage_github.assert_called_once()
        stage_ontology.assert_called_once()
        self.assertEqual(
            stage_github.call_args.args[1],
            stage_ontology.call_args.args[1],
        )
        verify_github.assert_called_once_with(
            repository_root,
            github_installation,
        )
        verify_ontology.assert_called_once_with(
            repository_root,
            ontology_installation,
            query_artifact_source_kind="http",
            query_artifact_channel_name="stable",
            query_artifact_base_url=(
                "https://example.cloudfront.net/ontology/query/v1/"
            ),
        )
        activate.assert_called_once_with(
            repository_root,
            [github_installation, ontology_installation],
            rendered_documents,
        )
        setup_result_type = getattr(
            set_up_mcp_servers,
            "RepositoryLocalMcpSetupResult",
            None,
        )
        self.assertIsNotNone(setup_result_type)
        self.assertEqual(
            result,
            setup_result_type(
                github_mcp_server_version="GitHub MCP Server v1.11.0",
                universal_ontology_mcp_verification={
                    "ontologyQueryArtifactSourceKind": "http",
                    "toolNames": ["search_entities", "resolve_entity"],
                },
                activated_paths=(repository_root / ".mcp.json",),
            ),
        )


class SetupArgumentParsingTests(unittest.TestCase):
    def test_rejects_http_only_options_for_the_filesystem_source(self):
        with self.assertRaises(SystemExit) as raised:
            set_up_mcp_servers.parse_args(
                ["--universal-ontology-query-artifact-channel=development"]
            )

        self.assertEqual(raised.exception.code, 2)

    def test_accepts_an_explicit_http_channel_and_artifact_base_url(self):
        arguments = set_up_mcp_servers.parse_args(
            [
                "--universal-ontology-query-artifact-source=http",
                "--universal-ontology-query-artifact-channel=stable",
                (
                    "--universal-ontology-query-artifact-base-url="
                    "https://example.cloudfront.net/ontology/query/v1/"
                ),
            ]
        )

        self.assertEqual(
            arguments.universal_ontology_query_artifact_source,
            "http",
        )
        self.assertEqual(
            arguments.universal_ontology_query_artifact_channel,
            "stable",
        )
        self.assertEqual(
            arguments.universal_ontology_query_artifact_base_url,
            "https://example.cloudfront.net/ontology/query/v1/",
        )

    def test_defaults_repository_setup_to_the_filesystem_query_artifact_source(
        self,
    ):
        arguments = set_up_mcp_servers.parse_args([])

        self.assertEqual(
            arguments.universal_ontology_query_artifact_source,
            "file-system",
        )


if __name__ == "__main__":
    unittest.main()
