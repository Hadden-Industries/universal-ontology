"""Native baseline contracts: linkage and bytes are not owner acceptance."""
from __future__ import annotations

import argparse
import copy
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

REPOSITORY = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY / 'scripts'))
import sdlc
import _sdlc_state as state
from _sdlc_baseline import BaselineBlob, MAX_BASELINE_BYTES, is_canonical_plan_path
import validate_sdlc_pr as pr
from _commands import SetupError

PLAN = 'docs/plans/accepted-[é].md'
PLAN_BYTES = '# Accepted fixture\n\nThe result preserves Ω.\n'.encode('utf-8')


class NativePlanLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='wp6-', delete=False)
        def retain_failure_or_cleanup():
            result = self._outcome.result
            if any(test.id().startswith(self.id()) for test, _ in result.failures + result.errors):
                print('Failed fixture retained:', self.temporary.name)
            else:
                self.temporary.cleanup()
        self.addCleanup(retain_failure_or_cleanup)
        self.repo = Path(self.temporary.name) / 'répo with spaces'
        self.repo.mkdir()
        self.template = Path(self.temporary.name) / 'empty-template'
        self.template.mkdir()
        shutil.copytree(REPOSITORY / '.sdlc/schemas', self.repo / '.sdlc/schemas')
        shutil.copy2(REPOSITORY / '.sdlc/pipeline-policy.json', self.repo / '.sdlc/pipeline-policy.json')
        (self.repo / '.gitignore').write_text('.sdlc/runtime/\n.sdlc/tmp/\n__pycache__/\n', encoding='utf-8')
        (self.repo / 'value.txt').write_bytes(b'accepted\n')
        config = {'schemaVersion': 2, 'profiles': {
            name: [{'name': name + '-fixture', 'argv': [sys.executable, '-c',
                "from pathlib import Path; assert Path('value.txt').read_bytes() == b'accepted\\n'"]}]
            for name in ('focused', 'affected', 'full')},
            'additionalFingerprintInputs': ['.sdlc/verification.json']}
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, config)
        self.git('init', '-q', '--template=' + str(self.template))
        self.git('config', 'user.name', 'SDLC test fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        (self.repo / PLAN).parent.mkdir(parents=True)
        (self.repo / PLAN).write_bytes(PLAN_BYTES)
        self.git('add', '--all')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Accepted offline fixture')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.repo), *args], check=True,
                              capture_output=True, timeout=30).stdout

    def begin(self, path=PLAN, risk='R2'):
        arguments = argparse.Namespace(task='plan-fixture', risk=risk, baseline=path,
            intent_reference='fixture-owner-decision', purpose='Preserve the accepted result.',
            new_functionality=False, software_selection_reference=None)
        with redirect_stdout(io.StringIO()):
            sdlc.begin_task(self.repo, arguments)

    def test_real_committed_plan_admits_r2_without_changing_bytes(self):
        self.assertEqual(self.git('show', 'HEAD:' + PLAN), PLAN_BYTES)
        self.begin()
        active = state.load_json(self.repo / state.ACTIVE_TASK_PATH)
        self.assertEqual(active['riskClass'], 'R2')
        self.assertEqual(active['requiredProfiles'], ['full'])
        self.assertEqual(active['baseline'], PLAN)
        self.assertEqual((self.repo / PLAN).read_bytes(), PLAN_BYTES)

    def test_optional_plan_still_requires_committed_identity_without_raising_risk(self):
        uncommitted = 'docs/plans/uncommitted.md'
        (self.repo / uncommitted).write_bytes(PLAN_BYTES)
        with self.assertRaises(SetupError):
            self.begin(uncommitted, risk='R1')
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())
        self.begin(risk='R1')
        active = state.load_json(self.repo / state.ACTIVE_TASK_PATH)
        self.assertEqual(active['riskClass'], 'R1')
        self.assertEqual(active['requiredProfiles'], ['affected'])
        with redirect_stdout(io.StringIO()):
            sdlc.record_task_disposition(self.repo, argparse.Namespace(reason='Fixture pause', evidence_reference='fixture'), False)
        (self.repo / PLAN).write_bytes(PLAN_BYTES + b'Changed.\n')
        with self.assertRaises(SetupError):
            sdlc.resume_task(self.repo, argparse.Namespace(decision_reference='fixture-resume'))

    def test_real_cli_uses_approved_python_and_preserves_initial_ownership(self):
        shutil.copytree(REPOSITORY / 'scripts', self.repo / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
        config_before = (self.repo / '.git/config').read_bytes()
        command = [sys.executable, '-B', '-X', 'utf8', str(self.repo / 'scripts/sdlc.py'), 'begin', 'native-plan-fixture',
                   '--risk', 'R2', '--baseline', PLAN, '--intent-reference', 'fixture-owner-decision',
                   '--purpose', 'Preserve accepted output', '--no-new-functionality']
        first = subprocess.run(command, cwd=self.repo, capture_output=True, timeout=30)
        (Path(self.temporary.name) / 'cli-first.stdout.bin').write_bytes(first.stdout)
        (Path(self.temporary.name) / 'cli-first.stderr.bin').write_bytes(first.stderr)
        self.assertEqual(first.returncode, 0, first.stderr.decode('utf-8'))
        active = (self.repo / state.ACTIVE_TASK_PATH).read_bytes()
        self.assertEqual(json.loads(active)['requiredProfiles'], ['full'])
        second = subprocess.run(command, cwd=self.repo, capture_output=True, timeout=30)
        (Path(self.temporary.name) / 'cli-second.stdout.bin').write_bytes(second.stdout)
        (Path(self.temporary.name) / 'cli-second.stderr.bin').write_bytes(second.stderr)
        self.assertEqual(second.returncode, 1)
        self.assertIn(b'already exists', second.stderr)
        self.assertEqual((self.repo / state.ACTIVE_TASK_PATH).read_bytes(), active)
        self.assertEqual((self.repo / '.git/config').read_bytes(), config_before)

    def test_noncanonical_paths_fail_without_acquiring_state(self):
        for path in ('/docs/plans/a.md', '../outside.md', 'docs/plans/../a.md',
                     'docs//plans/a.md', 'docs/plans/./a.md', 'docs\\plans\\a.md',
                     'C:/docs/plans/a.md', 'docs/plans/a.md:stream', 'docs/plans/a b.md',
                     'docs/plans/a\t.md', 'docs/plans/a\0.md', 'docs/plans/a\x7f.md',
                     'docs/plans/a.MD', 'docs/plans/.md'):
            with self.subTest(path=path):
                self.assertFalse(is_canonical_plan_path(path))
                with self.assertRaises(SetupError):
                    self.begin(path)
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_empty_invalid_and_byte_changed_local_plans_preserve_incumbent(self):
        self.begin()
        active = (self.repo / state.ACTIVE_TASK_PATH).read_bytes()
        for raw in (b'', b' \n\t', b'\xff', b'abc\0def', PLAN_BYTES.replace(b'\n', b'\r\n'),
                    b'\xef\xbb\xbf' + PLAN_BYTES, b'x' * (MAX_BASELINE_BYTES + 1)):
            with self.subTest(raw_length=len(raw)):
                (self.repo / PLAN).write_bytes(raw)
                with self.assertRaises(SetupError):
                    self.begin()
                self.assertEqual((self.repo / state.ACTIVE_TASK_PATH).read_bytes(), active)

    def test_native_symlink_and_gitlink_modes_reject_without_checkout(self):
        for mode, oid in (('120000', self.git('rev-parse', 'HEAD:' + PLAN).decode().strip()),
                          ('160000', self.git('rev-parse', 'HEAD').decode().strip())):
            with self.subTest(mode=mode):
                self.git('update-index', '--add', '--cacheinfo', mode + ',' + oid + ',' + PLAN)
                self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Synthetic nonregular entry')
                self.assertTrue(self.git('ls-tree', 'HEAD', '--', ':(literal)' + PLAN).startswith(mode.encode()))
                with self.assertRaisesRegex(SetupError, 'regular'):
                    self.begin()
        self.assertEqual((self.repo / PLAN).read_bytes(), PLAN_BYTES)
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_plan_freshness_and_explicit_resume_preserve_old_receipts(self):
        self.begin()
        first = state.load_json(self.repo / state.ACTIVE_TASK_PATH)
        with redirect_stdout(io.StringIO()):
            sdlc.verify_task(self.repo, argparse.Namespace(profile=None, keep_going=False))
        self.assertEqual(state.required_verification_gaps(self.repo), [])
        receipt = (self.repo / '.sdlc/runtime/verification/full.json').read_bytes()
        (self.repo / PLAN).write_bytes(PLAN_BYTES + b'Another line.\n')
        self.assertTrue(state.required_verification_gaps(self.repo))
        with redirect_stdout(io.StringIO()):
            sdlc.record_task_disposition(self.repo, argparse.Namespace(reason='Fixture pause', evidence_reference='fixture'), False)
        with self.assertRaises(SetupError):
            sdlc.resume_task(self.repo, argparse.Namespace(decision_reference='fixture-resume'))
        # Reverse only this test's last source edit; no Git restoration operation.
        (self.repo / PLAN).write_bytes(PLAN_BYTES)
        with redirect_stdout(io.StringIO()):
            sdlc.resume_task(self.repo, argparse.Namespace(decision_reference='fixture-resume'))
        resumed = state.load_json(self.repo / state.ACTIVE_TASK_PATH)
        self.assertNotEqual(resumed['taskId'], first['taskId'])
        self.assertEqual(resumed['requiredProfiles'], ['full'])
        self.assertEqual((self.repo / '.sdlc/runtime/verification/full.json').read_bytes(), receipt)
        self.assertTrue(state.required_verification_gaps(self.repo))

    def remote_objects(self, ref='HEAD'):
        """Model GitHub transport from native Git objects, never the reader's parser."""
        import base64
        revision = self.git('rev-parse', ref).decode('ascii').strip()
        root_tree = self.git('rev-parse', ref + '^{tree}').decode('ascii').strip()
        responses = {f'repos/example/service/git/commits/{revision}':
                     {'sha': revision, 'tree': {'sha': root_tree}}}
        for suffix in ('', ':docs', ':docs/plans'):
            tree_id = (root_tree if not suffix else self.git('rev-parse', ref + suffix).decode('ascii').strip())
            entries = []
            for row in self.git('ls-tree', '-z', tree_id).split(b'\0'):
                if not row:
                    continue
                metadata, name = row.split(b'\t', 1)
                mode, kind, oid = metadata.decode('ascii').split()
                entries.append({'path': name.decode('utf-8'), 'mode': mode, 'type': kind, 'sha': oid})
            responses[f'repos/example/service/git/trees/{tree_id}'] = {
                'sha': tree_id, 'truncated': False, 'tree': entries}
        blob_id = self.git('rev-parse', ref + ':' + PLAN).decode('ascii').strip()
        responses[f'repos/example/service/git/blobs/{blob_id}'] = {
            'sha': blob_id, 'encoding': 'base64', 'size': len(PLAN_BYTES),
            'content': base64.encodebytes(PLAN_BYTES).decode('ascii')}
        return revision, responses

    def test_remote_reader_uses_native_regular_entry_and_exact_bytes(self):
        revision, responses = self.remote_objects()
        with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]) as calls:
            blob = pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        self.assertEqual(blob.raw, PLAN_BYTES)
        self.assertEqual(blob.repository, 'example/service')
        self.assertEqual(blob.mode, '100644')
        self.assertEqual(blob.object_id, self.git('rev-parse', 'HEAD:' + PLAN).decode().strip())
        self.assertEqual(len(calls.call_args_list), 5)
        self.assertFalse(any('/contents/' in call.args[0] for call in calls.call_args_list))

    def test_native_tree_and_blob_failures_never_use_contents_alias(self):
        revision, pristine = self.remote_objects()
        blob_key = next(key for key in pristine if '/blobs/' in key)
        leaf_tree_key = next(key for key, value in pristine.items()
                             if '/trees/' in key and any(entry['path'] == PLAN.split('/')[-1] for entry in value['tree']))
        cases = [
            ('truncated', leaf_tree_key, 'truncated', True),
            ('tree identity', leaf_tree_key, 'sha', 'b' * 40),
            ('missing tree entries', leaf_tree_key, 'tree', []),
            ('wrong blob identity', blob_key, 'sha', 'b' * 40),
            ('wrong size', blob_key, 'size', len(PLAN_BYTES) + 1),
            ('boolean size', blob_key, 'size', True),
            ('oversize', blob_key, 'size', MAX_BASELINE_BYTES + 1),
            ('bad encoding', blob_key, 'encoding', 'utf8'),
            ('bad base64', blob_key, 'content', '!!!!'),
            ('wrong content', blob_key, 'content', 'eHl6'),
        ]
        for name, key, field, value in cases:
            responses = copy.deepcopy(pristine)
            responses[key][field] = value
            with self.subTest(case=name), patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
                with self.assertRaises(SetupError):
                    pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        for mode, kind in (('120000', 'blob'), ('160000', 'commit'), ('040000', 'tree')):
            responses = copy.deepcopy(pristine)
            responses[leaf_tree_key]['tree'][0].update(mode=mode, type=kind)
            with self.subTest(mode=mode), patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
                with self.assertRaisesRegex(SetupError, 'regular-file'):
                    pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        with patch.object(pr, 'gh_api', side_effect=SetupError('403 metadata unavailable')):
            with self.assertRaisesRegex(SetupError, '403 metadata unavailable'):
                pr.fetch_baseline_at_revision('example/service', PLAN, revision)

    def test_plan_reference_shape_exact_lines_and_mode_identity(self):
        revision, responses = self.remote_objects()
        with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
            baseline = pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        fields = {'issue': 'none', 'baseline': PLAN, 'risk': 'R2', 'baseline_only': 'no',
                  'new_functionality': 'no', 'software_selection': 'none',
                  'baseline_acceptance': 'fixture-decision', 'acceptance': '["The result preserves Ω."]'}
        def validate(prior=baseline):
            return pr.validate_pull_request_linkage(REPOSITORY, fields, 'example/service', None,
                                                   ['src/result.py'], baseline, prior)
        self.assertEqual(validate(), [])
        for reference in ('none', '', ' ', '-', 'N/A', 'pending'):
            fields['baseline_acceptance'] = reference
            self.assertTrue(validate())
        fields['baseline_acceptance'] = 'fixture-decision'
        for lines in ('none', '{}', '[]', '[null]', '[1]', '[""]', '["missing"]',
                      '["The result preserves Ω.", "The result preserves Ω."]',
                      '["The result preserves Ω. "]'):
            fields['acceptance'] = lines
            self.assertTrue(validate(), lines)
        fields['acceptance'] = '["The result preserves Ω."]'
        self.assertTrue(validate(None))
        changed_mode = BaselineBlob(baseline.repository, baseline.revision, baseline.path,
                                   '100755', baseline.object_id, baseline.raw)
        self.assertTrue(validate(changed_mode))
        body = ('Change issue: none\nAccepted baseline: ' + PLAN + '\nRisk class: R2\n'
                'Acceptance IDs implemented: ["The result preserves Ω."]\nBaseline-only: no\n'
                'New functionality: no\nSoftware selection: none\n')
        for extra in ('', 'Baseline acceptance: \n', 'Baseline acceptance: good\nBaseline acceptance: other\n'):
            with self.assertRaises(SetupError):
                pr.parse_pull_request_fields(body + extra)

    def test_plan_pr_links_distinct_exact_lines_without_claiming_acceptance(self):
        revision, responses = self.remote_objects()
        with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
            baseline = pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        body = ('Change issue: none\nAccepted baseline: ' + PLAN + '\n'
                'Baseline acceptance: fixture-reference-not-authenticated\nRisk class: R2\n'
                'Acceptance IDs implemented: ["The result preserves Ω."]\nBaseline-only: no\n'
                'New functionality: no\nSoftware selection: none\n')
        fields = pr.parse_pull_request_fields(body)
        errors = pr.validate_pull_request_linkage(REPOSITORY, fields, 'example/service', None,
                                                  ['src/result.py'], baseline, baseline)
        self.assertEqual(errors, [])
        self.assertNotIn('approved', fields)
        self.assertNotIn('acceptedBy', fields)

    def test_trusted_entry_point_reads_fork_identity_and_rename_source(self):
        source = self.repo / 'src/old.py'
        source.parent.mkdir()
        source.write_bytes(b'print("fixture")\n')
        self.git('add', '--', 'src/old.py')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Prior source fixture')
        base, responses = self.remote_objects()
        source.rename(self.repo / 'src/new.py')
        self.git('add', '--all')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Rename source fixture')
        head, head_responses = self.remote_objects()
        self.assertNotEqual(base, head)
        self.assertIn(b'R100\tsrc/old.py\tsrc/new.py', self.git('diff', '--name-status', '--find-renames', base, head))
        responses.update({key.replace('example/service', 'contributor/fork'): value
                          for key, value in head_responses.items()})
        body = ('Change issue: none\nAccepted baseline: ' + PLAN + '\n'
                'Baseline acceptance: fixture-reference-not-authenticated\nRisk class: R2\n'
                'Acceptance IDs implemented: ["The result preserves Ω."]\nBaseline-only: no\n'
                'New functionality: no\nSoftware selection: none\n')
        pull = {'number': 7, 'body': body, 'changed_files': 1,
                'base': {'sha': base, 'repo': {'full_name': 'example/service'}, 'ref': 'main'},
                'head': {'sha': head, 'repo': {'full_name': 'contributor/fork'}, 'ref': 'feature'}}
        responses['repos/example/service/pulls/7'] = pull
        responses['repos/example/service/pulls/7/files?per_page=100&page=1'] = [
            {'filename': 'src/new.py', 'previous_filename': 'src/old.py', 'status': 'renamed'}]
        event = Path(self.temporary.name) / 'event.json'
        event.write_text(json.dumps({'pull_request': pull}), encoding='utf-8')
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'example/service', 'GITHUB_EVENT_PATH': str(event)}):
            with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]) as calls:
                with redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(pr.main(), 0)
            self.assertTrue(any('repos/contributor/fork/git/' in call.args[0] for call in calls.call_args_list))
            self.assertIn('linkage valid', output.getvalue())
            responses['repos/example/service/pulls/7/files?per_page=100&page=1'][0]['previous_filename'] = PLAN
            with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
                with self.assertRaisesRegex(SetupError, 'renamed'):
                    pr.main()

    def test_paginated_native_metadata_target_movement_and_candidate_data_boundary(self):
        base, responses = self.remote_objects()
        sentinel = self.repo / 'candidate-ran.txt'
        candidate = self.repo / 'candidate.py'
        candidate.write_text('from pathlib import Path\nPath("candidate-ran.txt").write_text("executed")\n', encoding='utf-8')
        changes = [{'filename': 'candidate.py', 'status': 'added'}]
        for number in range(100):
            filename = f'src/result-{number}.py'
            file = self.repo / filename
            file.parent.mkdir(exist_ok=True)
            file.write_bytes(b'result = 1\n')
            changes.append({'filename': filename, 'status': 'added'})
        self.git('add', '--all')
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Candidate data only')
        head, head_responses = self.remote_objects()
        responses.update(head_responses)
        self.assertEqual(len(self.git('diff', '--name-only', '-z', base, head).split(b'\0')) - 1, 101)
        body = ('Change issue: none\nAccepted baseline: ' + PLAN + '\n'
                'Baseline acceptance: fixture-decision\nRisk class: R2\n'
                'Acceptance IDs implemented: ["The result preserves Ω."]\nBaseline-only: no\n'
                'New functionality: no\nSoftware selection: none\n')
        pull = {'number': 7, 'body': body, 'changed_files': 101,
                'base': {'sha': base, 'repo': {'full_name': 'example/service'}, 'ref': 'main'},
                'head': {'sha': head, 'repo': {'full_name': 'example/service'}, 'ref': 'feature'}}
        responses['repos/example/service/pulls/7'] = pull
        responses['repos/example/service/pulls/7/files?per_page=100&page=1'] = changes[:100]
        responses['repos/example/service/pulls/7/files?per_page=100&page=2'] = changes[100:]
        event = Path(self.temporary.name) / 'event.json'
        event.write_text(json.dumps({'pull_request': pull}), encoding='utf-8')
        actual_popen = subprocess.Popen
        commands = []
        def native_response(arguments, **kwargs):
            self.assertEqual(arguments[:4], ['gh', 'api', '--method', 'GET'])
            self.assertEqual(len(arguments), 5)
            commands.append(arguments)
            encoded = json.dumps(responses[arguments[4]]).encode('utf-8')
            return actual_popen([sys.executable, '-c', 'import sys;sys.stdout.buffer.write(' + repr(encoded) + ')'], **kwargs)
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'example/service', 'GITHUB_EVENT_PATH': str(event), 'GH_TOKEN': 'synthetic-private-token'}):
            with patch.object(pr.subprocess, 'Popen', side_effect=native_response), redirect_stdout(io.StringIO()):
                self.assertEqual(pr.main(), 0)
            self.assertFalse(sentinel.exists())
            self.assertTrue(any('page=2' in command[-1] for command in commands))
            pristine = copy.deepcopy(responses)
            for key, changed in (('body', body + '\nchanged'), ('changed_files', 102)):
                count = 0
                def moving(endpoint):
                    nonlocal count
                    value = copy.deepcopy(pristine[endpoint])
                    if endpoint == 'repos/example/service/pulls/7':
                        count += 1
                        if key == 'changed_files' or count == 2:
                            value[key] = changed
                    return value
                with self.subTest(key=key), patch.object(pr, 'gh_api', side_effect=moving):
                    with self.assertRaises(SetupError):
                        pr.main()
            responses['repos/example/service/pulls/7/files?per_page=100&page=2'] = changes[:1]
            with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
                with self.assertRaisesRegex(SetupError, 'duplicate'):
                    pr.main()

    def test_remote_selected_plan_absence_and_duplicate_lines_are_not_acceptance(self):
        revision, responses = self.remote_objects()
        tree_key = next(key for key, value in responses.items() if '/trees/' in key
                        and any(entry['path'] == PLAN.split('/')[-1] for entry in value['tree']))
        responses[tree_key]['tree'] = []
        with patch.object(pr, 'gh_api', side_effect=lambda endpoint: responses[endpoint]):
            with self.assertRaisesRegex(SetupError, 'absent'):
                pr.fetch_baseline_at_revision('example/service', PLAN, revision)
        (self.repo / PLAN).write_bytes(PLAN_BYTES + b'The result preserves ' + 'Ω'.encode() + b'.\n')
        self.git('add', '--', PLAN)
        self.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'Ambiguous source lines')
        native = state.read_local_baseline_at_revision(self.repo, PLAN)
        baseline = BaselineBlob('example/service', native.revision, PLAN, native.mode, native.object_id, native.raw)
        fields = {'issue': 'none', 'baseline': PLAN, 'risk': 'R2', 'baseline_only': 'no',
                  'new_functionality': 'no', 'software_selection': 'none',
                  'baseline_acceptance': 'fixture-decision', 'acceptance': '["The result preserves Ω."]'}
        errors = pr.validate_pull_request_linkage(REPOSITORY, fields, 'example/service', None,
                                                 ['src/result.py'], baseline, baseline)
        self.assertTrue(any('exactly once' in error for error in errors))

    def test_redirected_local_parent_is_rejected_before_admission(self):
        original = self.repo / 'docs/plans'
        retained = self.repo / 'retained-plans'
        original.rename(retained)
        if os.name == 'nt':
            result = subprocess.run(['cmd', '/c', 'mklink', '/J', str(original), str(retained)],
                                    capture_output=True, timeout=30)
            result.check_returncode()
            self.assertTrue(original.is_junction())
        else:
            original.symlink_to(retained, target_is_directory=True)
            self.assertTrue(original.is_symlink())
        with self.assertRaisesRegex(SetupError, 'redirected'):
            self.begin()
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())
        self.assertEqual((retained / PLAN.split('/')[-1]).read_bytes(), PLAN_BYTES)
        if os.name == 'nt':
            original.rmdir()  # Remove only this test-created junction, never its target.
        else:
            original.unlink()


class NativeMetadataTransportTests(unittest.TestCase):
    def invoke_transport(self, program, *, limit=None, timeout=None):
        actual_popen = subprocess.Popen
        commands = []
        def native_fixture(arguments, **kwargs):
            commands.append(arguments)
            self.assertEqual(arguments, ['gh', 'api', '--method', 'GET', 'repos/example/service/git/commits/' + 'a' * 40])
            return actual_popen([sys.executable, '-c', program], **kwargs)
        with patch.dict(os.environ, {'GH_TOKEN': 'private-fixture-token'}), \
                patch.object(pr.subprocess, 'Popen', side_effect=native_fixture), \
                patch.object(pr, 'MAX_GITHUB_JSON_BYTES', limit or pr.MAX_GITHUB_JSON_BYTES), \
                patch.object(pr, 'METADATA_TIMEOUT_SECONDS', timeout or 30):
            try:
                return pr.gh_api('repos/example/service/git/commits/' + 'a' * 40)
            finally:
                self.assertEqual(len(commands), 1)

    def test_native_json_transport_strict_codec_and_limit(self):
        self.assertEqual(self.invoke_transport("import sys; sys.stdout.buffer.write(b'{\"value\": 1}')"), {'value': 1})
        for program in ("import sys; sys.stdout.buffer.write(b'\\xff')",
                        "print('{')", "import sys; sys.exit(1)",
                        "import sys; sys.stdout.buffer.write(b'x' * 65)"):
            with self.subTest(program=program), self.assertRaises(SetupError) as error:
                self.invoke_transport(program, limit=64)
            self.assertNotIn('private-fixture-token', str(error.exception))
        self.assertEqual(self.invoke_transport("print('0' + ' ' * 62, end='')", limit=64), 0)

    def test_native_metadata_timeout_is_not_an_empty_success(self):
        with self.assertRaisesRegex(SetupError, 'timed out'):
            self.invoke_transport('import time; time.sleep(5)', timeout=0.1)

    def test_native_json_rejects_ambiguous_and_nonfinite_values(self):
        for raw in (b'{"sha":"one","sha":"two"}', b'{"size":NaN}'):
            with self.subTest(raw=raw), self.assertRaises(SetupError):
                self.invoke_transport('import sys;sys.stdout.buffer.write(' + repr(raw) + ')')

    def test_actual_eight_mebibyte_response_limit(self):
        limit = pr.MAX_GITHUB_JSON_BYTES
        self.assertEqual(limit, 8 * 1024 * 1024)
        value = self.invoke_transport("import sys;sys.stdout.buffer.write(b'\"' + b'a' * " + str(limit - 2) + " + b'\"')")
        self.assertEqual(len(value), limit - 2)
        with self.assertRaisesRegex(SetupError, 'response limit'):
            self.invoke_transport('import sys;sys.stdout.buffer.write(b"x" * ' + str(limit + 1) + ')')

    def test_endpoint_and_missing_token_reject_before_process(self):
        with patch.object(pr.subprocess, 'Popen', side_effect=AssertionError('No process allowed')):
            with patch.dict(os.environ, {'GH_TOKEN': ''}):
                with self.assertRaisesRegex(SetupError, 'GH_TOKEN'):
                    pr.gh_api('repos/example/service/pulls/1')
            with patch.dict(os.environ, {'GH_TOKEN': 'fixture'}):
                for endpoint in ('https://foreign.invalid/data', 'repos/example/service/issues/1;echo', '../x'):
                    with self.assertRaises(SetupError):
                        pr.gh_api(endpoint)


if __name__ == '__main__':
    unittest.main()
