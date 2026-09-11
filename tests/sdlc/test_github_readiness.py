"""Issue availability is a read-only prerequisite, not GitHub adoption evidence."""
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
import bootstrap_github_sdlc as bootstrap


class GitHubIssueReadinessTests(unittest.TestCase):
    def invoke(self, arguments, metadata):
        output, errors = io.StringIO(), io.StringIO()
        with (patch.object(sys, 'argv', ['bootstrap_github_sdlc.py', *arguments]),
              patch.object(bootstrap, 'derive_repo_from_script', return_value=Path.cwd()),
              patch.object(bootstrap, 'require_command', return_value='gh'),
              patch.object(bootstrap, 'run', return_value=subprocess.CompletedProcess(
                  ['gh'], 0, stdout=json.dumps(metadata))) as transport,
              redirect_stdout(output), redirect_stderr(errors)):
            result = bootstrap.main()
        return result, output.getvalue() + errors.getvalue(), transport.call_args_list

    def test_disabled_issues_blocks_readiness_without_remote_writes(self):
        result, diagnostic, calls = self.invoke(['--check-issue-readiness'],
            {'nameWithOwner': 'example/service', 'hasIssuesEnabled': False})
        self.assertEqual(result, 1)
        self.assertIn('Issues is disabled', diagnostic)
        self.assertIn('has_issues', diagnostic)
        self.assertEqual([call.args[0] for call in calls],
            [('gh', 'repo', 'view', '--json', 'nameWithOwner,hasIssuesEnabled')])

    def test_enabled_issues_reports_only_the_checked_capability(self):
        result, diagnostic, calls = self.invoke(['--check-issue-readiness'],
            {'nameWithOwner': 'example/service', 'hasIssuesEnabled': True})
        self.assertEqual(result, 0)
        self.assertIn('Issues is enabled', diagnostic)
        self.assertIn('not verified', diagnostic)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].args[0][1:3], ('repo', 'view'))

    def test_missing_or_malformed_availability_never_reports_readiness(self):
        for metadata in ({}, [], {'hasIssuesEnabled': 'false'}, {'hasIssuesEnabled': 1},
                         {'nameWithOwner': 'example/service', 'hasIssuesEnabled': None}):
            with self.subTest(metadata=metadata):
                result, _, calls = self.invoke(['--check-issue-readiness'], metadata)
                self.assertEqual(result, 1)
                self.assertEqual(len(calls), 1)
                self.assertEqual(calls[0].args[0][1:3], ('repo', 'view'))

    def test_explicit_label_installation_keeps_its_existing_inventory(self):
        result, _, calls = self.invoke([], {})
        self.assertEqual(result, 0)
        self.assertEqual(len(calls), len(bootstrap.LABELS))
        self.assertEqual([call.args[0][3] for call in calls], [item[0] for item in bootstrap.LABELS])
        self.assertTrue(all(call.args[0][1:3] == ('label', 'create') for call in calls))
