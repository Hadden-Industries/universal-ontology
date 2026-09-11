"""Real CLI contracts for retained resource metadata; no user resources are fixtures."""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
import _sdlc_resource_disposition as resources

REPOSITORY = Path(__file__).resolve().parents[2]


def held_input(location: Path) -> dict:
    return {
        'recordType': 'resource-disposition-input', 'schemaVersion': 1,
        'coordinationReference': 'fixture-task:wp3', 'recordedBy': 'fixture-coordinator',
        'recordingAuthorityReference': 'fixture-decision:metadata',
        'decisionReference': 'fixture-decision:hold',
        'entry': {
            'resourceId': None, 'supersedes': [], 'kind': 'worktree',
            'host': socket.gethostname(), 'locations': [str(location)],
            'identityReference': 'fixture:native-registration',
            'owningTaskReference': None, 'owningTaskId': None, 'owner': None,
            'coordinator': 'fixture-coordinator', 'nextActor': 'fixture-owner',
            'purpose': 'Retain the consumer fixture and its evidence.',
            'candidate': {'head': None, 'observedAt': None, 'inputsReference': None},
            'consumers': [], 'preservation': {'state': 'required',
                'locationReference': None, 'readbackReference': None,
                'independentOfDisposedTree': None, 'reason': 'Await owner evidence.'},
            'disposition': 'held', 'rationale': 'Ownership decision is pending.',
            'blockers': [{'kind': 'ownership', 'description': 'Await owner.', 'reference': None}],
            'reassessment': {'event': 'Owner replies.', 'reviewAt': None},
            'inspectionReference': None, 'assessmentReference': None,
            'disposalAuthorityReference': None, 'operation': None, 'postRemovalReadback': None}}


def eligible_input(location: Path) -> dict:
    document = held_input(location)
    document['entry'].update(owner='fixture-owner', blockers=[],
        disposition='eligible-for-approved-removal', inspectionReference='fixture:inspection',
        assessmentReference='fixture:assessment')
    document['entry']['preservation'].update(state='not-required', reason='Synthetic disposable fixture.')
    return document


def removed_input(location: Path) -> dict:
    document = eligible_input(location)
    document['entry'].update(disposition='removed-confirmed', operation={
        'operationReference': 'fixture:simulated-operation', 'authorityReference': 'fixture:authority',
        'outcome': 'succeeded', 'commandText': 'opaque; MUST NOT EXECUTE', 'denialRule': None,
        'operatorRequestReference': None, 'permissionError': None}, postRemovalReadback={
        'observedAt': '2026-09-01T00:00:00Z', 'observedBy': 'fixture-operator',
        'inventoryReference': 'fixture:declared-inventory', 'filesystemReference': 'fixture:declared-path',
        'evidenceReadbackReference': None, 'members': [{'path': str(location),
            'registration': 'absent', 'filesystem': 'absent', 'containingLocationAccessible': True}]})
    return document


class ResourceDispositionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='wp3-', delete=False)
        self.addCleanup(self.finish_fixture)
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / 'seed'
        self.repo.mkdir()
        self.empty_git = self.root / 'empty-git'
        self.empty_git.mkdir()
        shutil.copytree(REPOSITORY / 'scripts', self.repo / 'scripts',
                        ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copytree(REPOSITORY / '.sdlc/schemas', self.repo / '.sdlc/schemas')
        shutil.copy2(REPOSITORY / '.sdlc/pipeline-policy.json', self.repo / '.sdlc/pipeline-policy.json')
        (self.repo / 'value.txt').write_text('accepted\n')
        configuration = {'schemaVersion': 2, 'profiles': {
            name: [{'name': f'{name}-fixture', 'argv': [sys.executable, '-c',
                "from pathlib import Path; assert Path('value.txt').read_text() == 'accepted\\n'"]}]
            for name in ('focused', 'affected', 'full')},
            'additionalFingerprintInputs': ['.sdlc/verification.json']}
        (self.repo / '.sdlc/verification.json').write_text(json.dumps(configuration), encoding='utf-8')
        (self.repo / '.gitignore').write_text('.sdlc/runtime/\n.sdlc/tmp/\n__pycache__/\n')
        self.git('init', '-q', '--template=' + str(self.empty_git))
        self.git('config', 'user.name', 'SDLC test fixture')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('add', '--all')
        self.git('commit', '-qm', 'Fixture state')
        self.linked = self.root / 'review Ω'
        self.git('worktree', 'add', '--detach', str(self.linked), 'HEAD')
        self.input = self.repo / '.sdlc/tmp/resource.json'
        self.input.parent.mkdir(parents=True)
        self.write_input(held_input(self.linked))

    def finish_fixture(self):
        result = self._outcome.result
        if any(test.id().startswith(self.id()) for test, _ in result.failures + result.errors):
            print('Failed resource fixture retained:', self.root)
        else:
            self.temporary.cleanup()

    def git(self, *arguments):
        return subprocess.run(['git', '-c', 'core.hooksPath=' + str(self.empty_git),
            '-C', str(self.repo), *arguments], check=True, capture_output=True,
            text=True, encoding='utf-8', timeout=30).stdout

    def cli(self, *arguments, cwd=None):
        environment = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        return subprocess.run([sys.executable, '-X', 'utf8',
            str(self.repo / 'scripts/sdlc.py'), *arguments], cwd=cwd or self.root,
            env=environment, capture_output=True, text=True, encoding='utf-8', timeout=30)

    def write_input(self, value):
        self.input.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def record(self):
        result = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/resource.json')
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_idle_status_reports_native_worktrees_as_unattributed(self):
        result = self.cli('status')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['statusFormatVersion'], 1)
        self.assertIsNone(report['active'])
        self.assertEqual(report['activeReadState'], 'absent')
        self.assertEqual(report['resourceDispositions'], [])
        self.assertEqual({Path(w['nativePath']) for w in report['unattributedWorktrees']},
                         {self.repo, self.linked})
        self.assertEqual(report['readProblems'], [])

    @unittest.skipUnless(os.name == 'nt', 'Windows native short-path aliases')
    def test_short_paths_cannot_bypass_protected_or_nested_worktrees(self):
        import ctypes
        from ctypes import wintypes

        get_short_path = ctypes.WinDLL('kernel32', use_last_error=True).GetShortPathNameW
        get_short_path.argtypes = (wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD)
        get_short_path.restype = wintypes.DWORD
        buffer = ctypes.create_unicode_buffer(32768)
        length = get_short_path(str(self.root), buffer, len(buffer))
        self.assertGreater(length, 0)
        self.assertLess(length, len(buffer))
        alias = Path(buffer.value)
        if alias == self.root:
            self.skipTest('This volume does not provide a distinct short-path alias.')
        self.assertTrue(alias.samefile(self.root))
        nested = self.linked / 'nested'
        self.git('worktree', 'add', '--detach', str(nested), 'HEAD')
        for location in (alias, alias / 'seed', alias / self.linked.name):
            with self.subTest(location=location):
                self.write_input(eligible_input(location))
                result = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/resource.json')
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertFalse((self.repo / '.sdlc/runtime/handoffs').exists())
        leaf_alias = alias / self.linked.name / 'nested'
        self.write_input(removed_input(leaf_alias))
        result = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/resource.json')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('registered', result.stderr)
        self.assertFalse((self.repo / '.sdlc/runtime/handoffs').exists())
        self.write_input(eligible_input(leaf_alias))
        self.record()  # A distinct disposable leaf remains eligible through its alias.
        self.write_input(held_input(alias / self.linked.name))
        self.record()  # Holding an alias remains safe and retains the declaration.

    def test_record_is_visible_without_active_task_and_preserves_resource_bytes(self):
        sentinel = self.linked / 'consumer-evidence.txt'
        sentinel.write_bytes(b'retained synthetic evidence\x00\xff')
        published = self.record()
        stored = self.repo / published['recordPath']
        retained = stored.read_bytes()
        record = json.loads(retained)
        self.assertEqual(record['entry']['disposition'], 'held')
        self.assertEqual(record['inputSha256'], hashlib.sha256(self.input.read_bytes()).hexdigest())
        self.assertEqual(record['recordId'], published['recordId'])
        result = self.cli('status')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['resourceDispositions']), 1)
        self.assertEqual(report['resourceDispositions'][0]['recorded'], record)
        self.assertEqual(stored.read_bytes(), retained)
        self.assertEqual(sentinel.read_bytes(), b'retained synthetic evidence\x00\xff')
        self.assertFalse((self.repo / '.sdlc/runtime/active.json').exists())

    def test_strict_input_rejection_never_publishes_or_echoes_values(self):
        original = self.input.read_bytes()
        invalid = [b'\xff', b'{"secret":"private-marker","secret":1}',
                   b'{"private-marker":NaN}', b'[]']
        for field, value in [('schemaVersion', 99), ('private-marker', 'private-marker'),
                             ('recordType', 'resource-disposition')]:
            document = json.loads(original)
            document[field] = value
            invalid.append(json.dumps(document).encode('utf-8'))
        for raw in invalid:
            with self.subTest(raw=raw[:35]):
                self.input.write_bytes(raw)
                result = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/resource.json')
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn('private-marker', result.stderr + result.stdout)
                self.assertEqual(self.input.read_bytes(), raw)
                self.assertFalse((self.repo / '.sdlc/runtime/handoffs').exists())
        self.input.write_bytes(original)
        self.record()  # Positive control distinguishes valid input from blanket rejection.

    def test_conflicting_snapshots_require_explicit_all_leaf_reconciliation(self):
        first = self.record()
        original_path = self.repo / first['recordPath']
        original = original_path.read_bytes()
        second = json.loads(original)
        second['recordId'] = 'b' * 32
        # Simulate two valid concurrent publications, neither claiming the other.
        sibling_path = original_path.parent / ('resource-' + 'b' * 32 + '.json')
        sibling_path.write_text(json.dumps(second), encoding='utf-8')
        report = self.cli('status')
        self.assertNotEqual(report.returncode, 0)
        data = json.loads(report.stdout)
        self.assertEqual(len(data['resourceDispositions']), 2)
        self.assertIn('conflicting-snapshots', [p['code'] for p in data['readProblems']])
        update = held_input(self.linked)
        update['entry'].update(resourceId=first['resourceId'], supersedes=[first['recordId']])
        self.write_input(update)
        self.assertNotEqual(self.cli('record-resource-disposition', '--input',
                                     '.sdlc/tmp/resource.json').returncode, 0)
        update['entry']['supersedes'].append(second['recordId'])
        self.write_input(update)
        reconciled = self.record()
        report = self.cli('status')
        self.assertEqual(report.returncode, 0, report.stderr)
        self.assertEqual([r['recorded']['recordId'] for r in
                          json.loads(report.stdout)['resourceDispositions']], [reconciled['recordId']])
        self.assertEqual(original_path.read_bytes(), original)
        self.assertTrue(sibling_path.is_file())

    def test_malformed_active_and_handoff_keep_readable_obligations_visible(self):
        self.record()
        active = self.repo / '.sdlc/runtime/active.json'
        active.write_bytes(b'{"private-marker":')
        bad = active.parent / 'handoffs/future.json'
        bad.write_text('{"recordType":"private-marker","schemaVersion":100}', encoding='utf-8')
        result = self.cli('status')
        self.assertNotEqual(result.returncode, 0)
        report = json.loads(result.stdout)
        self.assertEqual(report['activeReadState'], 'invalid')
        self.assertEqual(len(report['resourceDispositions']), 1)
        self.assertEqual({p['code'] for p in report['readProblems']}, {'active-read', 'invalid-handoff'})
        self.assertNotIn('private-marker', result.stdout + result.stderr)
        self.assertEqual(active.read_bytes(), b'{"private-marker":')

    def test_directory_group_does_not_claim_worktree_attribution(self):
        document = held_input(self.linked)
        document['entry']['kind'] = 'owned-directory-group'
        self.write_input(document)
        self.record()
        report = json.loads(self.cli('status').stdout)
        self.assertIn(self.linked, {Path(w['nativePath']) for w in report['unattributedWorktrees']})
        self.assertEqual(report['resourceDispositions'][0]['currentObservation']['members'][0]
                         ['inspection'], 'not-inspected')

    def test_unavailable_registered_metadata_is_a_partial_report(self):
        self.record()
        # Inject an OS metadata denial, retaining native Git and real record consumption.
        with patch.object(resources, 'observe_member', return_value={
                'filesystem': 'unknown', 'containingLocationAccessible': False}):
            report = resources.build_status(self.repo)
        self.assertEqual(len(report['resourceDispositions']), 1)
        self.assertIn('resource-metadata', [p['code'] for p in report['readProblems']])

    def test_nested_registration_prevents_eligibility_but_remains_visible_when_held(self):
        nested = self.linked / 'nested'
        self.git('worktree', 'add', '--detach', str(nested), 'HEAD')
        self.write_input(eligible_input(self.linked))
        denied = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/resource.json')
        self.assertNotEqual(denied.returncode, 0)
        self.assertIn('nested', denied.stderr.lower())
        self.write_input(held_input(self.linked))
        self.record()
        report = json.loads(self.cli('status').stdout)
        observation = report['resourceDispositions'][0]
        self.assertIn('nested-registration', observation['attention'])
        self.assertEqual([Path(p) for p in observation['currentObservation']['members'][0]
                          ['nestedWorktrees']], [nested])

    def test_protected_roots_and_unreleased_consumers_cannot_be_eligible(self):
        for location in (self.repo, self.root):
            with self.subTest(location=location):
                self.write_input(eligible_input(location))
                self.assertNotEqual(self.cli('record-resource-disposition', '--input',
                                             '.sdlc/tmp/resource.json').returncode, 0)
        for consumer_state in ('required', 'unknown'):
            document = eligible_input(self.linked)
            document['entry']['consumers'] = [{'reference': 'fixture:consumer',
                'state': consumer_state, 'releaseEvidenceReference': None}]
            self.write_input(document)
            self.assertNotEqual(self.cli('record-resource-disposition', '--input',
                                         '.sdlc/tmp/resource.json').returncode, 0)
        self.write_input(eligible_input(self.linked))
        self.record()

    def test_confirmation_requires_fresh_absence_and_retains_distinct_observation(self):
        for location in (self.linked, self.root / 'missing-parent/member'):
            with self.subTest(location=location):
                self.write_input(removed_input(location))
                self.assertNotEqual(self.cli('record-resource-disposition', '--input',
                                             '.sdlc/tmp/resource.json').returncode, 0)
        absent = self.root / 'absent-synthetic-member'
        self.assertTrue(absent.parent.is_dir())
        self.assertFalse(absent.exists())
        supplied = removed_input(absent)
        self.write_input(supplied)
        published = self.record()
        stored = json.loads((self.repo / published['recordPath']).read_bytes())
        self.assertEqual(stored['entry']['postRemovalReadback'], supplied['entry']['postRemovalReadback'])
        observed = stored['confirmationObservation']
        self.assertEqual(observed['observedBy'], 'native-resource-recorder')
        self.assertNotEqual(observed['observedAt'], supplied['entry']['postRemovalReadback']['observedAt'])
        self.assertEqual(observed['members'], supplied['entry']['postRemovalReadback']['members'])
        self.assertNotEqual(observed['inventoryReference'], supplied['entry']['postRemovalReadback']['inventoryReference'])
        self.assertNotEqual(observed['filesystemReference'], supplied['entry']['postRemovalReadback']['filesystemReference'])
        # This is controlled absence plus declared simulated operation, not live removal evidence.
        self.assertFalse(absent.exists())

    def test_same_host_redirected_location_cannot_gain_eligibility(self):
        # A native directory junction works without Windows symlink privilege.
        if os.name != 'nt':
            redirected = self.root / 'redirected'
            redirected.symlink_to(self.linked, target_is_directory=True)
        else:
            redirected = self.root / 'redirected'
            result = subprocess.run(['cmd.exe', '/d', '/c', 'mklink', '/J',
                str(redirected), str(self.linked)], capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(redirected.is_junction())
        self.write_input(eligible_input(redirected))
        self.assertNotEqual(self.cli('record-resource-disposition', '--input',
                                     '.sdlc/tmp/resource.json').returncode, 0)
        self.assertTrue(self.linked.is_dir())

    def test_store_and_inventory_movement_report_partial_observations(self):
        self.record()
        listing = resources.handoff_listing(self.repo)
        with patch.object(resources, 'handoff_listing', side_effect=[listing, {}]):
            report = resources.build_status(self.repo)
        self.assertEqual(len(report['resourceDispositions']), 1)
        self.assertIn('observation-changed', [p['code'] for p in report['readProblems']])
        # A resource-size limit and a candidate-count limit must be visible gaps.
        with patch.object(resources, 'MAX_RECORD_BYTES', 5):
            report = resources.build_status(self.repo)
        self.assertIn('invalid-handoff', [p['code'] for p in report['readProblems']])
        with patch.object(resources, 'MAX_HANDOFF_FILES', 0):
            report = resources.build_status(self.repo)
        self.assertIn('handoff-read', [p['code'] for p in report['readProblems']])

    def test_record_from_another_coordinator_never_authorizes_local_inspection(self):
        published = self.record()
        path = self.repo / published['recordPath']
        stored = json.loads(path.read_bytes())
        stored['scope']['coordinatorRoot'] = str(self.linked)
        path.write_text(json.dumps(stored), encoding='utf-8')
        with patch.object(resources, 'observe_member', side_effect=AssertionError('foreign scope inspected')):
            report = resources.build_status(self.repo)
        self.assertEqual(len(report['resourceDispositions']), 1)
        self.assertIn('record-scope', [p['code'] for p in report['readProblems']])
        self.assertIn(self.linked, {Path(w['nativePath']) for w in report['unattributedWorktrees']})

    def test_active_state_movement_is_not_reported_as_a_stable_view(self):
        original = resources.read_metadata
        active = self.repo / '.sdlc/runtime/active.json'
        def moving_read(path):
            try:
                return original(path)
            except FileNotFoundError:
                if path == active:
                    active.parent.mkdir(parents=True, exist_ok=True)
                    active.write_text('{}', encoding='utf-8')
                raise
        with patch.object(resources, 'read_metadata', side_effect=moving_read):
            report = resources.build_status(self.repo)
        self.assertIn('observation-changed', [p['code'] for p in report['readProblems']])

    def test_relative_input_cannot_escape_or_use_a_redirected_directory(self):
        original = self.input.read_bytes()
        for supplied in (str(self.input), '../outside.json', 'C:outside.json' if os.name == 'nt' else '/outside'):
            with self.subTest(path=supplied):
                result = self.cli('record-resource-disposition', '--input', supplied)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('contained relative', result.stderr)
        self.assertEqual(self.input.read_bytes(), original)
        outside = self.root / 'outside-input'
        outside.mkdir()
        (outside / 'source.json').write_bytes(original)
        redirected = self.input.parent / 'redirected'
        if os.name == 'nt':
            result = subprocess.run(['cmd.exe', '/d', '/c', 'mklink', '/J',
                str(redirected), str(outside)], capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(redirected.is_junction())
        else:
            redirected.symlink_to(outside, target_is_directory=True)
        result = self.cli('record-resource-disposition', '--input', '.sdlc/tmp/redirected/source.json')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('redirected', result.stderr)
        self.assertEqual((outside / 'source.json').read_bytes(), original)
        self.assertFalse((self.repo / '.sdlc/runtime/handoffs').exists())

    def test_off_host_records_and_opaque_commands_never_execute_or_read_resources(self):
        document = held_input(self.linked)
        document['entry'].update(host='unreachable.fixture.invalid', disposition='operator-blocked',
            operation={'operationReference': 'fixture:actual-shaped-denial', 'authorityReference': None,
                'outcome': 'denied', 'commandText': 'opaque executable-looking text',
                'denialRule': 'fixture-rule', 'operatorRequestReference': 'fixture:request',
                'permissionError': None},
            blockers=[{'kind': 'guard', 'description': 'Simulated denial.', 'reference': 'fixture:denial'}])
        self.write_input(document)
        self.record()
        run = subprocess.run
        commands = []
        def native_queries_only(arguments, **kwargs):
            commands.append(arguments)
            self.assertIn(arguments[4:], [
                ['rev-parse', '--path-format=absolute', '--git-common-dir'],
                ['worktree', 'list', '--porcelain', '-z']])
            self.assertEqual(arguments[1:4], ['--no-optional-locks', '-C', str(self.repo)])
            return run(arguments, **kwargs)
        with (patch.object(resources.subprocess, 'run', side_effect=native_queries_only),
              patch.object(resources, 'observe_member', side_effect=AssertionError('off-host read'))):
            report = resources.build_status(self.repo)
        self.assertTrue(commands)
        self.assertEqual(report['readProblems'], [])
        self.assertEqual(report['resourceDispositions'][0]['recorded']['entry']['operation'],
                         document['entry']['operation'])

    def test_native_handoff_keeps_obligations_and_post_handoff_updates_visible(self):
        started = self.cli('begin', 'fixture-change', '--risk', 'R0', '--intent-reference',
            'fixture:accepted', '--purpose', 'Protect the fixture value.', '--no-new-functionality')
        self.assertEqual(started.returncode, 0, started.stderr)
        active_path = self.repo / '.sdlc/runtime/active.json'
        active = active_path.read_bytes()
        first = self.record()
        self.assertEqual(active_path.read_bytes(), active)
        disposition = ['--reason', 'Fixture handoff', '--evidence-reference', first['recordPath'],
                       '--acknowledge-retained-evidence']
        self.assertNotEqual(self.cli('handoff', *disposition).returncode, 0)
        self.assertTrue(active_path.is_file())
        verified = self.cli('verify')
        self.assertEqual(verified.returncode, 0, verified.stderr)
        receipts = {p.relative_to(self.repo): p.read_bytes()
                    for p in (self.repo / '.sdlc/runtime/runs').rglob('*') if p.is_file()}
        self.assertTrue(receipts)
        handed_off = self.cli('handoff', *disposition)
        self.assertEqual(handed_off.returncode, 0, handed_off.stderr)
        self.assertFalse(active_path.exists())
        historical = {p: p.read_bytes() for p in (self.repo / '.sdlc/runtime/handoffs').glob('*.json')}
        report = json.loads(self.cli('status').stdout)
        self.assertIsNone(report['active'])
        self.assertEqual(report['legacyHandoffsWithoutResourceMetadata'], 1)
        self.assertEqual(report['resourceDispositions'][0]['recorded']['entry']['nextActor'], 'fixture-owner')
        update = held_input(self.linked)
        update['entry'].update(resourceId=first['resourceId'], supersedes=[first['recordId']],
                              nextActor='fixture-receiving-maintainer')
        self.write_input(update)
        self.record()
        self.assertFalse(active_path.exists())
        for path, raw in historical.items():
            self.assertEqual(path.read_bytes(), raw)
        for path, raw in receipts.items():
            self.assertEqual((self.repo / path).read_bytes(), raw)

    def test_two_worktrees_never_consume_or_overwrite_each_others_runtime(self):
        foreign_runtime = self.linked / '.sdlc/runtime'
        foreign_runtime.mkdir(parents=True)
        sentinel = foreign_runtime / 'active.json'
        sentinel.write_bytes(b'private foreign control bytes; intentionally invalid')
        self.record()
        local_report = self.cli('status')
        self.assertEqual(local_report.returncode, 0, local_report.stderr)
        self.assertNotIn('private foreign', local_report.stdout)
        self.assertEqual(sentinel.read_bytes(), b'private foreign control bytes; intentionally invalid')
        foreign_result = subprocess.run([sys.executable, '-X', 'utf8',
            str(self.linked / 'scripts/sdlc.py'), 'status'], cwd=self.repo,
            capture_output=True, encoding='utf-8', timeout=30)
        self.assertNotEqual(foreign_result.returncode, 0)
        foreign_report = json.loads(foreign_result.stdout)
        self.assertEqual(Path(foreign_report['scope']['coordinatorRoot']), self.linked)
        self.assertEqual(foreign_report['resourceDispositions'], [])

    def test_changed_head_and_dirty_inputs_never_inherit_assessment_freshness(self):
        document = eligible_input(self.linked)
        document['entry']['candidate'].update(head=self.git('rev-parse', 'HEAD').strip(),
                                             observedAt='2026-09-01T00:00:00Z')
        self.write_input(document)
        self.record()
        ignored = self.linked / '.sdlc/tmp/private-evidence'
        ignored.parent.mkdir(parents=True)
        ignored.write_bytes(b'synthetic-private-credential')
        (self.linked / 'value.txt').write_text('changed dirty bytes\n')
        report = json.loads(self.cli('status').stdout)
        observation = report['resourceDispositions'][0]
        self.assertIn('recorded-eligibility-requires-fresh-operator-inspection', observation['attention'])
        self.assertNotIn('candidate-head-changed', observation['attention'])
        self.assertTrue(observation['currentObservation']['dirtyInputs'].startswith('not-inspected'))
        self.assertNotIn('synthetic-private', json.dumps(report))
        self.git('-C', str(self.linked), 'add', 'value.txt')
        self.git('-C', str(self.linked), 'commit', '-qm', 'Changed fixture candidate')
        report = json.loads(self.cli('status').stdout)
        self.assertIn('candidate-head-changed', report['resourceDispositions'][0]['attention'])
        self.assertEqual(ignored.read_bytes(), b'synthetic-private-credential')

    def test_concurrent_native_successors_remain_distinct_conflicting_snapshots(self):
        first = self.record()
        update = held_input(self.linked)
        update['entry'].update(resourceId=first['resourceId'], supersedes=[first['recordId']])
        self.write_input(update)
        # Both real recorder processes reach publication after reading the same history.
        # Stdin is the controlled barrier; no retry/sleep chooses a lucky schedule.
        child = (
            "import sys; from pathlib import Path; "
            "sys.path.insert(0, sys.argv[1]); import _sdlc_resource_disposition as r; "
            "import sdlc; native = r.publish_record\n"
            "def synchronized_publish(path, raw):\n"
            " print('ready', flush=True)\n"
            " assert sys.stdin.readline() == 'publish\\n'\n"
            " native(path, raw)\n"
            "r.publish_record = synchronized_publish\n"
            "sys.argv = ['sdlc.py', 'record-resource-disposition', '--input', '.sdlc/tmp/resource.json']\n"
            "raise SystemExit(sdlc.main())\n")
        processes = [subprocess.Popen([sys.executable, '-B', '-X', 'utf8', '-c', child,
            str(self.repo / 'scripts')], cwd=self.root, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8') for _ in range(2)]
        executor = ThreadPoolExecutor(max_workers=2)
        try:
            ready = [executor.submit(process.stdout.readline) for process in processes]
            for response in ready:
                self.assertEqual(response.result(timeout=20), 'ready\n')
            for process in processes:
                process.stdin.write('publish\n')
                process.stdin.flush()
            results = [process.communicate(timeout=20) for process in processes]
            for process, (_, error) in zip(processes, results):
                self.assertEqual(process.returncode, 0, error)
            identities = {json.loads(output)['recordId'] for output, _ in results}
            self.assertEqual(len(identities), 2)
            report = self.cli('status')
            self.assertNotEqual(report.returncode, 0)
            data = json.loads(report.stdout)
            self.assertEqual({r['recorded']['recordId'] for r in data['resourceDispositions']}, identities)
            self.assertIn('conflicting-snapshots', [p['code'] for p in data['readProblems']])
            self.assertTrue((self.repo / first['recordPath']).is_file())
        finally:
            for process in processes:
                if process.poll() is None:
                    process.kill()
                process.communicate(timeout=10)
            executor.shutdown(wait=True)


class ResourceHistoryTests(unittest.TestCase):
    def test_invalid_histories_preserve_visible_records(self):
        for predecessors, other_resource, code in [
                (['missing'], False, 'invalid-supersession'),
                (['a'], False, 'invalid-supersession'),
                (['b'], True, 'invalid-supersession'),
                (['b'], False, 'cyclic-supersession')]:
            with self.subTest(code=code, predecessors=predecessors):
                records = {'a': {'entry': {'resourceId': 'r', 'supersedes': predecessors}},
                           'b': {'entry': {'resourceId': 's' if other_resource else 'r',
                                           'supersedes': ['a']}}}
                leaves, problems = resources.resource_leaves(records)
                self.assertIn(code, [p['code'] for p in problems])
                self.assertEqual(sum(len(items) for items in leaves.values()), 2)

    def test_native_inventory_rejects_malformed_required_fields(self):
        path = str(REPOSITORY).encode('utf-8')
        prefix = b'worktree ' + path + b'\0'
        for fields in [b'HEAD invalid\0detached', b'HEAD ' + b'a'*40 + b'\0branch',
                       b'bare unexpected', b'HEAD ' + b'a'*40 + b'\0detached false']:
            with self.subTest(fields=fields):
                with self.assertRaises(resources.SetupError):
                    resources.parse_worktrees(prefix + fields + b'\0\0')
        valid = resources.parse_worktrees(prefix + b'HEAD ' + b'a'*40 +
            b'\0detached\0locked reason with spaces\0future arbitrary\0\0')
        self.assertEqual(valid[0]['nativeMetadata']['future'], 'arbitrary')
        self.assertEqual(valid[0]['nativeMetadata']['locked'], 'reason with spaces')


class ResourcePublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='wp3-publication-', delete=False)
        self.root = Path(self.temporary.name)
        self.path = self.root / 'resource.json'
        self.raw = b'{"fixture":"complete"}\n'
        self.addCleanup(self.finish_fixture)

    def finish_fixture(self):
        result = self._outcome.result
        if any(test.id().startswith(self.id()) for test, _ in result.failures + result.errors):
            print('Failed publication fixture retained:', self.root)
        else:
            self.temporary.cleanup()

    def test_collision_never_overwrites_prior_record(self):
        self.path.write_bytes(b'prior evidence')
        with self.assertRaisesRegex(resources.SetupError, 'not published'):
            resources.publish_record(self.path, self.raw)
        self.assertEqual(self.path.read_bytes(), b'prior evidence')
        candidates = list(self.root.glob('.resource-preparation-*'))
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].read_bytes(), self.raw)

    def test_link_failure_retains_complete_candidate_without_replacement_fallback(self):
        with patch.object(resources.os, 'link', side_effect=OSError('unsupported filesystem')):
            with self.assertRaisesRegex(resources.SetupError, 'not published'):
                resources.publish_record(self.path, self.raw)
        self.assertFalse(self.path.exists())
        self.assertEqual(next(self.root.glob('.resource-preparation-*')).read_bytes(), self.raw)

    def test_readback_or_interruption_after_publication_never_rolls_back_record(self):
        for failure in (OSError('readback failure'), KeyboardInterrupt()):
            with self.subTest(failure=type(failure).__name__):
                target = self.root / (type(failure).__name__ + '.json')
                with patch.object(resources, 'read_metadata', side_effect=failure):
                    with self.assertRaisesRegex(resources.SetupError, 'published; inspect before retry'):
                        resources.publish_record(target, self.raw)
                self.assertEqual(target.read_bytes(), self.raw)

    def test_write_and_close_failure_keep_primary_failure_and_preparation(self):
        native_fdopen = os.fdopen
        class FailingStream:
            def __init__(self, descriptor):
                self.stream = native_fdopen(descriptor, 'wb')
            def write(self, raw):
                self.stream.write(raw[:3])
                raise OSError('primary write failure')
            def flush(self):
                self.stream.flush()
            def close(self):
                self.stream.close()
                raise ValueError('secondary close failure')
        with patch.object(resources.os, 'fdopen', side_effect=lambda fd, mode: FailingStream(fd)):
            with self.assertRaises(resources.SetupError) as failure:
                resources.publish_record(self.path, self.raw)
        self.assertEqual(str(failure.exception.__cause__), 'primary write failure')
        self.assertIn('Secondary close failure: ValueError.', failure.exception.__cause__.__notes__)
        self.assertFalse(self.path.exists())
        self.assertEqual(next(self.root.glob('.resource-preparation-*')).read_bytes(), self.raw[:3])

    def test_private_name_cleanup_failure_retains_published_record(self):
        with patch.object(Path, 'unlink', side_effect=PermissionError('private cleanup denied')):
            with self.assertRaisesRegex(resources.SetupError, 'published; inspect before retry'):
                resources.publish_record(self.path, self.raw)
        self.assertEqual(self.path.read_bytes(), self.raw)
        self.assertEqual(next(self.root.glob('.resource-preparation-*')).read_bytes(), self.raw)

    def test_acknowledgement_failure_reports_the_established_identity(self):
        import argparse
        import sdlc
        established = {'recordId': 'a' * 32, 'recordPath': '.sdlc/runtime/handoffs/resource-a.json'}
        with (patch.object(sdlc, 'record_disposition', return_value=established),
              patch.object(sdlc, 'write_console_diagnostic', side_effect=OSError('broken pipe'))):
            with self.assertRaisesRegex(resources.SetupError, 'retained at .*acknowledgement failed') as failure:
                sdlc.record_resource_disposition(self.root, argparse.Namespace(input='metadata.json'))
        self.assertIn(established['recordId'], str(failure.exception))
