"""Repository integration boundaries, independent of scaffold self-consistency."""
from __future__ import annotations

import json
import copy
import os
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import set_up_sdlc as setup
import validate_sdlc_pr as pr_validation
import _sdlc_state as state
from _commands import SetupError

SELECTED = '''approval_policy = "on-request"
sandbox_mode = "workspace-write"
[agents]
enabled = true
max_concurrent_threads_per_session = 4
interrupt_message = true
'''


class RepositorySdlcIntegrationTests(unittest.TestCase):
    def test_codex_merge_preserves_mcp_and_unrelated_root_settings(self):
        existing = ('model_reasoning_effort = "medium"\n'
                    '# Keep this comment\n[sandbox_workspace_write]\nnetwork_access = true\n'
                    '[mcp_servers.example]\ncommand = "node"\nargs = ["keep.js"]\n')
        result = setup.merge_codex_sdlc_configuration(existing, SELECTED)
        parsed = tomllib.loads(result)
        for key, value in tomllib.loads(existing).items():
            self.assertEqual(parsed[key], value)
        self.assertIn(existing, result)
        self.assertEqual(setup.merge_codex_sdlc_configuration(result, SELECTED), result)

    def test_unmanaged_agent_policy_is_preserved_for_review(self):
        with self.assertRaisesRegex(SetupError, "Unmanaged"):
            setup.merge_codex_sdlc_configuration('[agents]\nenabled = false\n', SELECTED)

    def test_hook_merge_preserves_other_stop_and_command_guard_hooks(self):
        guard = {"matcher": "Bash", "hooks": [{"type": "command", "command": "dcg"}]}
        independent = {"hooks": [{"type": "command", "command": "independent-check"}]}
        existing = {"description": "User hooks", "hooks": {"PreToolUse": [guard], "Stop": [independent]}}
        result = setup.merge_sdlc_hooks(json.dumps(existing))
        parsed = json.loads(result)
        self.assertEqual(parsed["hooks"]["PreToolUse"], [guard])
        self.assertEqual(parsed["hooks"]["Stop"][0], independent)
        self.assertEqual(parsed["description"], "User hooks")
        self.assertEqual(setup.merge_sdlc_hooks(result), result)

    def test_duplicate_json_members_are_rejected_before_publication(self):
        with self.assertRaisesRegex(SetupError, "duplicate"):
            setup.merge_sdlc_hooks('{"hooks": {}, "hooks": {}}')

    def test_declared_date_and_uri_formats_reject_invalid_values(self):
        repository = Path(__file__).resolve().parents[2]
        document = {"schemaVersion": 1, "repository": "example/ontology",
                    "capturedAt": "2026-09-07T00:00:00Z", "acceptedAt": "2026-09-07T00:00:00Z",
                    "acceptedBy": "fixture", "version": 1,
                    "issue": {"number": 1, "title": "Fixture", "url": "https://github.com/example/ontology/issues/1",
                              "labels": [], "body": "", "bodySha256": "0" * 64}}
        for field, value in (("acceptedAt", "yesterday"), ("url", "not a URI")):
            with self.subTest(field=field):
                candidate = copy.deepcopy(document)
                (candidate["issue"] if field == "url" else candidate)[field] = value
                with self.assertRaises(SetupError):
                    state.validate_document(repository, "accepted-baseline.schema.json", candidate)


class PullRequestReadConsistencyTests(unittest.TestCase):
    def setUp(self):
        self.pr = {"number": 1, "head": {"sha": "a" * 40}, "base": {"sha": "b" * 40},
                   "changed_files": 1, "body": "Change issue: none\nAccepted baseline: none\nRisk class: R0\nAcceptance IDs implemented: none\nBaseline-only: no\nNew functionality: no\nSoftware selection: none\n"}
        self.event = {"pull_request": copy.deepcopy(self.pr)}

    def invoke(self, responses):
        with tempfile.TemporaryDirectory() as directory:
            event_path = Path(directory) / "event.json"
            event_path.write_text(json.dumps(self.event))
            with patch.dict(os.environ, {"GITHUB_EVENT_PATH": str(event_path), "GITHUB_REPOSITORY": "example/service"}), patch.object(pr_validation, "gh_api", side_effect=responses):
                return pr_validation.main()

    def test_base_movement_before_read_is_rejected(self):
        changed = copy.deepcopy(self.pr)
        changed["base"]["sha"] = "c" * 40
        with self.assertRaisesRegex(SetupError, "queued"):
            self.invoke([changed, [{"filename": "README.md", "status": "modified"}], changed])

    def test_base_movement_during_read_is_rejected(self):
        changed = copy.deepcopy(self.pr)
        changed["base"]["sha"] = "c" * 40
        with self.assertRaisesRegex(SetupError, "during"):
            self.invoke([self.pr, [{"filename": "README.md", "status": "modified"}], changed])

    def test_renaming_an_accepted_baseline_outside_its_directory_is_rejected(self):
        changes = [{"filename": "docs/moved.json", "previous_filename": "docs/sdlc/baselines/issue-1/v1.json", "status": "renamed"}]
        with self.assertRaisesRegex(SetupError, "immutable"):
            self.invoke([self.pr, changes, self.pr])


if __name__ == "__main__":
    unittest.main()
