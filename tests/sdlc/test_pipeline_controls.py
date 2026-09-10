"""Behavioural tests of local pipeline controls, not proof of agent compliance."""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from unittest.mock import patch

REPOSITORY = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY / 'scripts'))
import sdlc
import _sdlc_state as state
import _commands
import set_up_agent_skills as skill_setup
import validate_sdlc_pr as pull_request_validation
import set_up_sdlc
from _commands import SetupError


def baseline_document(risk: str = 'R2') -> dict:
    body = 'AC-001: Query results identify their ontology release.'
    return {
        'schemaVersion': 1, 'repository': 'example/service',
        'capturedAt': '2026-09-07T00:00:00Z', 'acceptedAt': '2026-09-06T23:00:00Z',
        'acceptedBy': '@example-owner', 'version': 1,
        'issue': {'number': 123, 'title': 'Ontology release identity',
                  'url': 'https://github.com/example/service/issues/123',
                  'labels': [f'risk:{risk}', 'state:accepted'], 'body': body,
                  'bodySha256': hashlib.sha256(body.encode()).hexdigest()}}


class LocalVerificationControlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix='sdlc controls ')
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        shutil.copytree(REPOSITORY / '.sdlc/schemas', self.repo / '.sdlc/schemas')
        shutil.copytree(REPOSITORY / 'scripts', self.repo / 'scripts',
                        ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copy2(REPOSITORY / 'tests/sdlc/fixtures/verification_process.py',
                     self.repo / 'verification_process.py')
        shutil.copy2(REPOSITORY / '.sdlc/pipeline-policy.json', self.repo / '.sdlc/pipeline-policy.json')
        (self.repo / '.gitignore').write_text('.sdlc/runtime/\n.sdlc/tmp/\n__pycache__/\n')
        (self.repo / 'value.txt').write_text('accepted\n')
        self.config = {'schemaVersion': 2, 'profiles': {
            name: [{'name': f'{name}-fixture', 'argv': [sys.executable, '-c',
                "from pathlib import Path; assert Path('value.txt').read_text() == 'accepted\\n'"]}]
            for name in ('focused', 'affected', 'full')},
            'additionalFingerprintInputs': ['.sdlc/verification.json']}
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.git('init', '-q')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'SDLC test fixture')
        self.commit('Initial fixture')

    def git(self, *arguments: str) -> str:
        return subprocess.run(['git', '-C', str(self.repo), *arguments], check=True,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

    def commit(self, message: str) -> None:
        self.git('add', '--all')
        self.git('commit', '-qm', message)

    def invoke(self, function, arguments: argparse.Namespace) -> str:
        with redirect_stdout(io.StringIO()) as output:
            function(self.repo, arguments)
        return output.getvalue()

    def begin_task(self, risk: str = 'R0', baseline: str | None = None) -> None:
        self.invoke(sdlc.begin_task, argparse.Namespace(task='fixture-change', risk=risk,
            baseline=baseline, intent_reference='accepted-test-task',
            purpose='Protect the accepted fixture value.', new_functionality=False, software_selection_reference=None))

    def test_new_functionality_requires_research_before_state_creation(self):
        for reference in (None, '', '   ', 'none', 'pending', 'N/A', '-'):
            arguments = argparse.Namespace(task='new-capability', risk='R0', baseline=None,
                intent_reference='accepted-fixture', purpose='Implement a capability',
                new_functionality=True, software_selection_reference=reference)
            with self.assertRaises(SetupError):
                self.invoke(sdlc.begin_task, arguments)
            self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_new_functionality_records_research_without_claiming_approval(self):
        arguments = argparse.Namespace(task='new-capability', risk='R1', baseline=None,
            intent_reference='accepted-fixture', purpose='Implement the researched capability',
            new_functionality=True, software_selection_reference='issue-123#selection-v1')
        self.invoke(sdlc.begin_task, arguments)
        active = state.load_json(self.repo / state.ACTIVE_TASK_PATH)
        self.assertTrue(active['newFunctionality'])
        self.assertEqual(active['softwareSelectionReference'], 'issue-123#selection-v1')
        self.assertNotIn('licenceApproved', active)

    def test_begin_requires_explicit_functionality_declaration(self):
        result = subprocess.run([sys.executable, str(self.repo / 'scripts/sdlc.py'),
            'begin', 'example', '--risk', 'R0', '--intent-reference', 'task',
            '--purpose', 'test'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('--new-functionality', result.stderr)


    def verify_task(self, profile: str | None = None, keep_going: bool = False) -> None:
        self.invoke(sdlc.verify_task, argparse.Namespace(profile=profile, keep_going=keep_going))

    def configure(self, profile: str, source: str) -> None:
        self.config['profiles'][profile][0]['argv'] = [sys.executable, '-c', source]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Configure test command')

    def disposition(self, completed: bool) -> None:
        arguments = argparse.Namespace(reason='Fixture handoff',
            evidence_reference='fixture-evidence-record', acknowledge_retained_evidence=True)
        self.invoke(lambda repo, args: sdlc.record_task_disposition(repo, args, completed), arguments)

    def test_r0_requires_only_focused_evidence(self):
        self.begin_task(); self.verify_task()
        self.assertEqual(state.required_verification_gaps(self.repo), [])
        self.assertTrue((self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json').is_file())
        self.assertFalse((self.repo / state.RUNTIME_DIRECTORY / 'verification/full.json').exists())

    def test_r1_requires_affected_not_full(self):
        self.begin_task('R1'); self.verify_task()
        self.assertEqual(state.required_verification_gaps(self.repo), [])
        self.assertFalse((self.repo / state.RUNTIME_DIRECTORY / 'verification/full.json').exists())

    def test_explicit_focused_does_not_satisfy_r1(self):
        self.begin_task('R1'); self.verify_task('focused')
        self.assertIn('Missing affected', '; '.join(state.required_verification_gaps(self.repo)))

    def test_r2_refuses_missing_prior_baseline(self):
        with self.assertRaises(SetupError): self.begin_task('R2')
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_r2_accepts_committed_baseline_and_requires_full(self):
        baseline_path = 'docs/sdlc/baselines/issue-123/v1.json'
        state.write_json_atomically(self.repo / baseline_path, baseline_document())
        self.commit('Prior accepted fixture baseline')
        self.begin_task('R2', baseline_path); self.verify_task()
        self.assertEqual(state.required_verification_gaps(self.repo), [])
        self.assertTrue((self.repo / state.RUNTIME_DIRECTORY / 'verification/full.json').is_file())

    def test_r2_refuses_uncommitted_baseline(self):
        baseline_path = 'docs/sdlc/baselines/issue-123/v1.json'
        state.write_json_atomically(self.repo / baseline_path, baseline_document())
        with self.assertRaises((SetupError, subprocess.CalledProcessError)):
            self.begin_task('R2', baseline_path)

    def test_start_does_not_overwrite_active_work(self):
        self.begin_task(); prior = (self.repo / state.ACTIVE_TASK_PATH).read_bytes()
        with self.assertRaises(SetupError): self.begin_task('R1')
        self.assertEqual((self.repo / state.ACTIVE_TASK_PATH).read_bytes(), prior)

    def test_source_change_invalidates_success(self):
        self.begin_task(); self.verify_task(); (self.repo / 'value.txt').write_text('changed\n')
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_new_untracked_input_invalidates_success(self):
        self.begin_task(); self.verify_task(); (self.repo / 'input.txt').write_text('new input')
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_declared_ignored_input_is_fingerprinted(self):
        with (self.repo / '.gitignore').open('a') as ignore_file: ignore_file.write('ignored-input.txt\n')
        (self.repo / 'ignored-input.txt').write_text('first')
        self.config['additionalFingerprintInputs'].append('ignored-input.txt')
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config); self.commit('Declare input')
        self.begin_task(); self.verify_task(); (self.repo / 'ignored-input.txt').write_text('second')
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_scratch_output_does_not_invalidate_success(self):
        self.begin_task(); self.verify_task()
        scratch = self.repo / '.sdlc/tmp/fixture'; scratch.mkdir(parents=True)
        (scratch / 'disposable-note.txt').write_text('not a test input')
        self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_control_change_requires_explicit_reroute(self):
        self.begin_task(); self.verify_task()
        self.config['profiles']['focused'][0]['name'] = 'Different check identity'
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        with self.assertRaises(SetupError): self.verify_task()
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_zero_exit_after_modifying_source_is_not_passing_evidence(self):
        self.configure('focused', "from pathlib import Path; Path('value.txt').write_text('changed\\n')")
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        self.assertFalse(state.load_json(self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')['passed'])

    def test_zero_exit_after_modifying_active_record_is_not_passing_evidence(self):
        self.configure('focused', "import json; from pathlib import Path; p=Path('.sdlc/runtime/active.json'); "
                       "r=json.loads(p.read_text()); r['purpose']='unauthorised replacement'; p.write_text(json.dumps(r))")
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()

    def test_missing_executable_is_recorded_unavailable(self):
        self.config['profiles']['focused'][0]['argv'] = ['missing-sdlc-test-executable-7ff39']
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config); self.commit('Unavailable check')
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        record = state.load_json(self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')
        self.assertEqual(record['commands'][0]['status'], 'unavailable')
        self.assertFalse(record['passed'])

    def test_verification_preserves_utf8_command_output(self):
        self.configure('focused', "import sys; sys.stdout.buffer.write(bytes.fromhex('5554462d383a20e6bca2e5ad97e29c930a'))")
        self.begin_task()
        self.verify_task()
        record = state.load_json(self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')
        self.assertTrue(record['passed'])
        self.assertEqual(record['commands'][0]['output'], 'UTF-8: 漢字✓\n')

    def test_failed_run_is_retained_when_next_run_passes(self):
        self.configure('focused', "import pathlib; raise SystemExit(0 if pathlib.Path('switch.txt').exists() else 1)")
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        retained = {path: path.read_bytes() for path in
                    (self.repo / state.RUNTIME_DIRECTORY / 'runs').rglob('*') if path.is_file()}
        (self.repo / 'switch.txt').write_text('corrected fixture')
        self.verify_task()
        self.assertTrue(retained)
        for path, contents in retained.items(): self.assertEqual(path.read_bytes(), contents)
        records = [state.load_json(path) for path in (self.repo / state.RUNTIME_DIRECTORY / 'runs').rglob('*.json')]
        self.assertEqual(sorted(record['passed'] for record in records), [False, True])
        self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_real_launcher_selects_utf8_without_replacing_stream_override(self):
        environment = dict(os.environ, PYTHONUTF8='0')
        environment.pop('PYTHONIOENCODING', None)
        code = "import json,sys; print(json.dumps([sys.flags.utf8_mode,sys.stdout.encoding,sys.argv[1:]]))"
        command = ['node', str(REPOSITORY / 'scripts/runRepositoryPython.js'), '-c', code, 'space and;literal']
        result = subprocess.run(command, env=environment, capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), [1, 'utf-8', ['space and;literal']])
        environment['PYTHONIOENCODING'] = 'cp1252:strict'
        overridden = subprocess.run(command, env=environment, capture_output=True, check=True)
        self.assertEqual(json.loads(overridden.stdout), [1, 'cp1252', ['space and;literal']])

    def test_real_cli_retains_unicode_child_failure(self):
        self.config['profiles']['focused'][0]['argv'] = [sys.executable,
            str(self.repo / 'verification_process.py'), '--exit-code', '7']
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Unicode byte producer'); self.begin_task()
        environment = dict(os.environ, PYTHONUTF8='0')
        environment.pop('PYTHONIOENCODING', None)
        result = subprocess.run(['node', str(REPOSITORY / 'scripts/runRepositoryPython.js'),
            str(self.repo / 'scripts/sdlc.py'), 'verify'], env=environment, capture_output=True)
        self.assertEqual(result.returncode, 1)
        current = self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json'
        self.assertTrue(current.is_file(), result.stderr)
        receipt = state.load_json(current)
        self.assertEqual(receipt['commands'][0]['returnCode'], 7)
        self.assertEqual(receipt['commands'][0]['output'], '\u2716 \u6f22\u5b57 \U0001f600\n')
        self.assertFalse(receipt['passed'])

    @unittest.skipUnless(os.name == 'nt', 'Native legacy-default protocol boundary is Windows-specific')
    def test_real_issue_protocol_does_not_use_legacy_default_decoding(self):
        issue = baseline_document()['issue']
        issue = dict(issue, body='Accepted \u2014 exact.\r\n', labels=[{'name':'risk:R2'}])
        issue_bytes = json.dumps(issue, ensure_ascii=False).encode('utf-8')
        code = f'''
import argparse, json, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, {str(REPOSITORY / 'scripts')!r})
import sdlc, _commands
assert sys.flags.utf8_mode == 0
def protocol(arguments, **kwargs):
    assert arguments[0] == 'gh'
    if arguments[1:4] == ['issue', 'view', '123']:
        payload = bytes.fromhex({issue_bytes.hex()!r})
    else:
        assert arguments[1:] == ['repo', 'view', '--json', 'nameWithOwner']
        payload = b'{{"nameWithOwner":"example/service"}}'
    return _commands.run([sys.executable, '-c', 'import sys; sys.stdout.buffer.write(' + repr(payload) + ')'], **kwargs)
with patch.object(sdlc, 'require_command', return_value='gh'), patch.object(sdlc, 'run', side_effect=protocol):
    sdlc.capture_issue_baseline(Path({str(self.repo)!r}), argparse.Namespace(issue=123, version=1,
        accepted_by='fixture', accepted_at='2026-09-10T00:00:00Z', approval_reference='fixture-only'))
'''
        result = subprocess.run([sys.executable, '-B', '-X', 'utf8=0', '-c', code], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        captured = state.load_json(self.repo / 'docs/sdlc/baselines/issue-123/v1.json')
        self.assertEqual(captured['issue']['body'], 'Accepted \u2014 exact.\r\n')
        markdown = (self.repo / 'docs/sdlc/baselines/issue-123/v1.md').read_bytes()
        self.assertTrue(markdown.endswith('Accepted \u2014 exact.\r\n\n'.encode('utf-8')))

    def test_completed_command_is_retained_before_report_failure(self):
        self.configure('focused', "import sys; sys.stdout.buffer.write(bytes.fromhex('636f6d706c657465642d6368696c642d65766964656e63650a'))")
        self.begin_task()
        owner = self
        class FailingReport(io.StringIO):
            def write(self, text):
                if text.startswith('completed-child-evidence'):
                    saved = state.load_json(owner.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')
                    owner.assertEqual(saved['commands'][0]['returnCode'], 0)
                    owner.assertEqual(saved['commands'][0]['output'], 'completed-child-evidence\n')
                    owner.assertEqual((owner.repo / saved['commands'][0]['capture']['path']).read_bytes(),
                                      b'completed-child-evidence\n')
                    raise OSError('fixture report failure')
                return super().write(text)
        with redirect_stdout(FailingReport()):
            try:
                sdlc.verify_task(self.repo, argparse.Namespace(profile=None, keep_going=False))
            except (OSError, SetupError, SystemExit):
                pass
        current = self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json'
        self.assertTrue(current.is_file(), 'Completed evidence disappeared at the reporting boundary')
        record = state.load_json(current)
        self.assertEqual(record['commands'][0]['returnCode'], 0)
        self.assertEqual(record['commands'][0]['output'], 'completed-child-evidence\n')
        self.assertFalse(record['passed'])

    def test_pending_attempt_replaces_same_input_success_before_child(self):
        self.configure('focused', "import json; from pathlib import Path; "
            "p=Path('.sdlc/runtime/check-admission'); "
            "r=json.loads(Path('.sdlc/runtime/verification/focused.json').read_text()) if p.exists() else None; "
            "assert r is None or r['passed'] is False")
        self.begin_task(); self.verify_task()
        first = (self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json').read_bytes()
        (self.repo / state.RUNTIME_DIRECTORY / 'check-admission').touch()
        self.verify_task()
        records = list((self.repo / state.RUNTIME_DIRECTORY / 'runs').rglob('*.json'))
        self.assertTrue(any(path.read_bytes() == first for path in records))
        self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_receipt_pair_preserves_exact_crlf_bytes(self):
        self.configure('focused', "import sys; sys.stdout.buffer.write(b'exact\\r\\n')")
        self.begin_task(); self.verify_task()
        record = state.load_json(self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')
        self.assertEqual(record['schemaVersion'], 3)
        canonical = self.repo / state.RUNTIME_DIRECTORY / 'runs' / record['taskId'] / (record['runId'] + '.json')
        self.assertEqual(state.load_json(canonical), record)
        command = record['commands'][0]
        self.assertEqual(command['output'], 'exact\r\n')
        raw = (self.repo / command['capture']['path']).read_bytes()
        self.assertEqual(raw, b'exact\r\n')
        self.assertEqual(command['capture']['byteLength'], 7)
        self.assertEqual(command['capture']['sha256'], hashlib.sha256(b'exact\r\n').hexdigest())

    def test_invalid_utf8_preserves_original_exit_and_raw_bytes(self):
        self.configure('focused', "import sys; sys.stdout.buffer.write(b'original\\xff\\r\\n'); raise SystemExit(7)")
        self.begin_task()
        try:
            self.verify_task()
        except (SystemExit, UnicodeError):
            pass
        current = self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json'
        self.assertTrue(current.is_file())
        record = state.load_json(current)
        command = record['commands'][0]
        self.assertEqual(command['returnCode'], 7)
        self.assertEqual(command['status'], 'failed')
        self.assertEqual(command['decodeStatus'], 'invalid-utf8')
        self.assertIsNone(command['output'])
        self.assertEqual((self.repo / command['capture']['path']).read_bytes(), b'original\xff\r\n')
        self.assertFalse(record['passed'])

    def test_reader_rejects_substituted_command_inventory_and_legacy_receipts(self):
        self.begin_task(); self.verify_task()
        current = self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json'
        original = state.load_json(current)
        changed = copy.deepcopy(original)
        changed['commands'][0]['name'] = 'not-the-required-check'
        state.write_json_atomically(current, changed)
        self.assertTrue(state.required_verification_gaps(self.repo))
        legacy = copy.deepcopy(original); legacy['schemaVersion'] = 2
        state.write_json_atomically(current, legacy)
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_first_recording_failure_starts_no_child(self):
        self.configure('focused', "from pathlib import Path; Path('.sdlc/runtime/should-not-start').touch()")
        self.begin_task()
        with (patch.object(state, 'write_json_atomically', side_effect=PermissionError('unwritable fixture')),
              patch.object(sdlc, 'write_json_atomically', side_effect=PermissionError('unwritable fixture'))):
            try:
                self.verify_task()
            except (OSError, SetupError, SystemExit):
                pass
        self.assertFalse((self.repo / state.RUNTIME_DIRECTORY / 'should-not-start').exists())

    def test_real_cli_escapes_explicit_legacy_streams_without_changing_evidence(self):
        self.config['profiles']['focused'][0]['argv'] = [sys.executable, str(self.repo / 'verification_process.py')]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Unicode producer'); self.begin_task()
        for encoding in ('cp1252:strict', 'ascii:ignore'):
            with self.subTest(encoding=encoding):
                result = subprocess.run(['node', str(REPOSITORY / 'scripts/runRepositoryPython.js'),
                    str(self.repo / 'scripts/sdlc.py'), 'verify'],
                    env=dict(os.environ, PYTHONIOENCODING=encoding), capture_output=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(b'\\u2716', result.stdout)
                receipt = state.load_json(self.repo / state.RUNTIME_DIRECTORY / 'verification/focused.json')
                self.assertEqual(receipt['commands'][0]['output'], '\u2716 \u6f22\u5b57 \U0001f600\n')
                self.assertEqual(receipt['commands'][0]['presentation'], 'escaped')

    def test_canonical_admission_failure_invalidates_old_success_without_starting_child(self):
        self.configure('focused', "from pathlib import Path; p=Path('.sdlc/runtime/started'); p.write_text(p.read_text()+'x' if p.exists() else 'x')")
        self.begin_task(); self.verify_task()
        original_write = sdlc.write_json_atomically
        def refuse_canonical(path, value):
            if value.get('status') == 'pending' and path.parent.name != 'verification':
                raise PermissionError('canonical admission unavailable')
            original_write(path, value)
        with patch.object(sdlc, 'write_json_atomically', side_effect=refuse_canonical):
            with self.assertRaises(SetupError): self.verify_task()
        self.assertEqual((self.repo / '.sdlc/runtime/started').read_text(), 'x')
        current = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertEqual(current['status'], 'pending')
        self.assertFalse(current['passed'])
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_native_current_directory_collision_starts_no_child(self):
        self.configure('focused', "from pathlib import Path; Path('.sdlc/runtime/started').touch()")
        self.begin_task()
        (self.repo / '.sdlc/runtime/verification/focused.json').mkdir(parents=True)
        result = subprocess.run([sys.executable, str(self.repo / 'scripts/sdlc.py'), 'verify'], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / '.sdlc/runtime/started').exists())

    def test_final_split_publication_rejects_success(self):
        self.begin_task()
        original_write = sdlc.write_json_atomically
        final_seen = False
        def fail_current_and_subsequent_writes(path, value):
            nonlocal final_seen
            if final_seen or (value.get('passed') is True and path.parent.name == 'verification'):
                final_seen = True
                raise PermissionError('store failed after canonical success')
            original_write(path, value)
        with patch.object(sdlc, 'write_json_atomically', side_effect=fail_current_and_subsequent_writes):
            with self.assertRaises(SystemExit): self.verify_task()
        current = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        canonical = state.load_json(self.repo / state.verification_run_path(current))
        self.assertFalse(current['passed']); self.assertTrue(canonical['passed'])
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_header_and_summary_write_or_flush_failure_never_publish_success(self):
        self.configure('focused', "from pathlib import Path; Path('.sdlc/runtime/started').touch()")
        self.begin_task()
        marker = self.repo / '.sdlc/runtime/started'
        for boundary in ('header', 'summary'):
            for operation in ('write', 'flush'):
                with self.subTest(boundary=boundary, operation=operation):
                    marker.unlink(missing_ok=True)
                    class FaultyConsole(io.StringIO):
                        target = False
                        def write(self, text):
                            self.target = text.startswith('==') if boundary == 'header' else text.startswith('focused:')
                            if self.target and operation == 'write': raise OSError('report write fault')
                            return super().write(text)
                        def flush(self):
                            if self.target and operation == 'flush': raise OSError('report flush fault')
                            return super().flush()
                    with redirect_stdout(FaultyConsole()), self.assertRaises(SystemExit):
                        sdlc.verify_task(self.repo, argparse.Namespace(profile=None, keep_going=True))
                    self.assertEqual(marker.exists(), boundary == 'summary')
                    self.assertTrue(state.required_verification_gaps(self.repo))

    def test_final_identity_failure_preserves_completed_command(self):
        self.begin_task()
        actual_identity = sdlc.verification_input_identity
        calls = 0
        def fail_final(*args):
            nonlocal calls
            calls += 1
            if calls == 2: raise OSError('final identity unreadable')
            return actual_identity(*args)
        with patch.object(sdlc, 'verification_input_identity', side_effect=fail_final):
            with self.assertRaises(SystemExit): self.verify_task()
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertEqual(record['commands'][0]['returnCode'], 0)
        self.assertIsNone(record['identityAfter'])
        self.assertEqual(record['problems'][-1]['phase'], 'identity')
        self.assertFalse(record['passed'])

    def test_reader_rejects_plausible_paired_inventory_and_capture_mutations(self):
        self.begin_task(); self.verify_task()
        current = self.repo / '.sdlc/runtime/verification/focused.json'
        original = state.load_json(current)
        for field, value in [('name', 'another check'), ('argv', ['other.exe']), ('ordinal', 2),
                             ('timeoutSeconds', 601), ('returnCode', 7), ('presentation', 'pending')]:
            with self.subTest(field=field):
                changed = copy.deepcopy(original); changed['commands'][0][field] = value
                state.write_json_atomically(current, changed)
                state.write_json_atomically(self.repo / state.verification_run_path(original), changed)
                self.assertTrue(state.required_verification_gaps(self.repo))
        for capture_path in ('../outside.bin', '.sdlc/runtime/runs/foreign/0001.output.bin'):
            changed = copy.deepcopy(original); changed['commands'][0]['capture']['path'] = capture_path
            state.write_json_atomically(current, changed)
            state.write_json_atomically(self.repo / state.verification_run_path(original), changed)
            self.assertTrue(state.required_verification_gaps(self.repo))
        state.write_json_atomically(current, original)
        state.write_json_atomically(self.repo / state.verification_run_path(original), original)
        raw = self.repo / original['commands'][0]['capture']['path']
        raw.write_bytes(b'changed size')
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_atomic_cleanup_failure_preserves_primary_error_and_prior_json(self):
        destination = self.repo / '.sdlc/runtime/owned.json'
        state.write_json_atomically(destination, {'prior': True})
        original = destination.read_bytes()
        with (patch.object(state.os, 'replace', side_effect=PermissionError('primary replacement fault')),
              patch.object(state.os, 'unlink', side_effect=OSError('secondary cleanup fault'))):
            with self.assertRaisesRegex(PermissionError, 'primary replacement fault'):
                state.write_json_atomically(destination, {'replacement': True})
        self.assertEqual(destination.read_bytes(), original)

    def test_existing_raw_output_is_never_overwritten(self):
        self.begin_task()
        owner = self
        class CollisionConsole(io.StringIO):
            def write(self, text):
                if text.startswith('=='):
                    record = state.load_json(owner.repo / '.sdlc/runtime/verification/focused.json')
                    target = owner.repo / state.verification_output_path(record, 1)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(b'preserved foreign bytes')
                return super().write(text)
        with redirect_stdout(CollisionConsole()), self.assertRaises(SystemExit):
            sdlc.verify_task(self.repo, argparse.Namespace(profile=None, keep_going=False))
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertIsNone(record['commands'][0]['returnCode'])
        self.assertEqual((self.repo / state.verification_output_path(record, 1)).read_bytes(), b'preserved foreign bytes')

    def test_keep_going_continues_ordinary_failure_but_stops_reporting_failure(self):
        self.config['profiles']['focused'] = [
            {'name': 'first', 'argv': [sys.executable, '-c', 'raise SystemExit(7)']},
            {'name': 'second', 'argv': [sys.executable, '-c', "from pathlib import Path; Path('.sdlc/runtime/second').touch()"]}]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Two commands'); self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task(keep_going=True)
        marker = self.repo / '.sdlc/runtime/second'
        self.assertTrue(marker.exists()); marker.unlink()
        with patch.object(sdlc, 'write_console_diagnostic', side_effect=OSError('report broken')):
            with self.assertRaises(SystemExit): self.verify_task(keep_going=True)
        self.assertFalse(marker.exists())

    def test_timeout_retains_partial_utf8_and_observed_child_result(self):
        ready = '.sdlc/runtime/ready'
        self.config['profiles']['focused'][0].update(timeoutSeconds=2, argv=[sys.executable,
            'verification_process.py', '--hex', '70726566697820e2', '--ready', ready,
            '--release', '.sdlc/runtime/release'])
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Ready timeout fixture'); self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        self.assertTrue((self.repo / ready).is_file(), 'Child never reached the byte-emitted readiness boundary')
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        result = record['commands'][0]
        self.assertEqual(result['status'], 'timeout')
        self.assertIsInstance(result['returnCode'], int)
        self.assertNotEqual(result['returnCode'], 0)
        self.assertEqual(result['decodeStatus'], 'invalid-utf8')
        self.assertIsNone(result['output'])
        self.assertEqual((self.repo / result['capture']['path']).read_bytes(), b'prefix \xe2')
        self.assertFalse(record['passed'])

    def test_runner_termination_preserves_prior_checkpoint_and_unfinished_child(self):
        self.config['profiles']['focused'] = [
            {'name': 'completed', 'argv': [sys.executable, 'verification_process.py', '--hex', '66697273740a']},
            {'name': 'waiting', 'argv': [sys.executable, 'verification_process.py', '--hex', '7365636f6e640a',
                '--ready', '.sdlc/runtime/ready', '--release', '.sdlc/runtime/release',
                '--output-closed', '.sdlc/runtime/output-closed']}]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Two process checkpoints'); self.begin_task()
        runner = subprocess.Popen([sys.executable, str(self.repo / 'scripts/sdlc.py'), 'verify'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ready = self.repo / '.sdlc/runtime/ready'
        try:
            deadline = time.monotonic() + 15
            while not ready.exists() and runner.poll() is None and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(ready.exists(), 'Waiting child never signalled readiness')
            runner.terminate(); runner.wait(timeout=10)
            record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
            self.assertFalse(record['passed'])
            first, second = record['commands']
            self.assertEqual(first['returnCode'], 0)
            self.assertEqual(first['output'], 'first\n')
            self.assertEqual((self.repo / first['capture']['path']).read_bytes(), b'first\n')
            self.assertIn(second['status'], ('pending', 'running'))
            self.assertIsNone(second['returnCode']); self.assertIsNone(second['finishedAt'])
            self.assertTrue(state.required_verification_gaps(self.repo))
        finally:
            (self.repo / '.sdlc/runtime/release').touch()
            if runner.poll() is None:
                runner.terminate(); runner.wait(timeout=10)
            # The deliberately detached fixture signals after explicitly closing
            # both output handles; opening a second writer would not prove that.
            deadline = time.monotonic() + 10
            closed = self.repo / '.sdlc/runtime/output-closed'
            if ready.exists():
                while not closed.exists() and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertTrue(closed.exists(), 'Owned fixture did not close its output handles')

    def test_caught_interrupt_stops_real_child_and_preserves_known_result(self):
        self.config['profiles']['focused'][0]['argv'] = [sys.executable, 'verification_process.py',
            '--ready', '.sdlc/runtime/ready', '--release', '.sdlc/runtime/release']
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Caught interrupt fixture'); self.begin_task()
        real_wait = subprocess.Popen.wait
        injected = False
        def interrupt_after_readiness(child, *args, **kwargs):
            nonlocal injected
            if 'verification_process.py' in child.args and not injected:
                deadline = time.monotonic() + 10
                while not (self.repo / '.sdlc/runtime/ready').exists() and time.monotonic() < deadline:
                    time.sleep(0.01)
                self.assertTrue((self.repo / '.sdlc/runtime/ready').exists())
                injected = True
                raise KeyboardInterrupt('controlled caught interruption')
            return real_wait(child, *args, **kwargs)
        with patch.object(subprocess.Popen, 'wait', new=interrupt_after_readiness):
            with self.assertRaises(SystemExit): self.verify_task()
        self.assertTrue(injected)
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertEqual(record['status'], 'interrupted')
        self.assertEqual(record['commands'][0]['status'], 'interrupted')
        self.assertIsInstance(record['commands'][0]['returnCode'], int)
        self.assertEqual((self.repo / record['commands'][0]['capture']['path']).read_bytes(),
                         '\u2716 \u6f22\u5b57 \U0001f600\n'.encode('utf-8'))
        self.assertFalse(record['passed'])

    def test_capture_read_failure_preserves_observed_exit(self):
        self.begin_task()
        real_read = Path.read_bytes
        def refuse_raw(path):
            if path.name.endswith('.output.bin'): raise OSError('raw read fault')
            return real_read(path)
        with patch.object(Path, 'read_bytes', new=refuse_raw):
            with self.assertRaises(SystemExit): self.verify_task()
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        result = record['commands'][0]
        self.assertEqual(result['returnCode'], 0)
        self.assertIsNotNone(result['finishedAt'])
        self.assertFalse(result['capture']['complete'])
        self.assertTrue((self.repo / result['capture']['path']).is_file())
        self.assertEqual(record['problems'][-1]['phase'], 'capture')

    def test_issue_transport_failure_creates_no_baseline(self):
        for payload, exit_code in ((b'\xff', 0), (b'{invalid JSON', 0), (b'{}', 7)):
            with self.subTest(payload=payload, exit_code=exit_code):
                def protocol(arguments, **kwargs):
                    self.assertEqual(arguments[1:4], ['issue', 'view', '123'])
                    source = f'import sys; sys.stdout.buffer.write(bytes.fromhex({payload.hex()!r})); raise SystemExit({exit_code})'
                    return _commands.run([sys.executable, '-c', source], **kwargs)
                with (patch.object(sdlc, 'require_command', return_value='gh'),
                      patch.object(sdlc, 'run', side_effect=protocol),
                      redirect_stderr(io.StringIO()) as diagnostic):
                    # CPython's Windows pipe reader reports decoding failures on
                    # its reader thread, leaving stdout=None. The JSON consumer
                    # then rejects None with TypeError; no valid text is invented.
                    expected_error = TypeError if os.name == 'nt' and payload == b'\xff' else (
                        UnicodeError if payload == b'\xff' else ValueError if exit_code == 0 else subprocess.CalledProcessError)
                    with self.assertRaises(expected_error):
                        self.invoke(sdlc.capture_issue_baseline, argparse.Namespace(issue=123, version=1,
                            accepted_by='fixture', accepted_at='2026-09-10T00:00:00Z', approval_reference='fixture'))
                    if os.name == 'nt' and payload == b'\xff':
                        self.assertIn('UnicodeDecodeError', diagnostic.getvalue())
                self.assertFalse((self.repo / 'docs/sdlc/baselines/issue-123').exists())

    def test_issue_capture_preserves_unicode_forms_crlf_and_prior_version(self):
        body = '\u00e9 e\u0301 \u2716 \u6f22\u5b57 \U0001f600\r\n'
        issue = dict(baseline_document()['issue'], body=body, labels=[{'name': 'risk:R2'}])
        issue_bytes = json.dumps(issue, ensure_ascii=False).encode('utf-8')
        def protocol(arguments, **kwargs):
            payload = issue_bytes if arguments[1] == 'issue' else b'{"nameWithOwner":"example/service"}'
            return _commands.run([sys.executable, '-c',
                f'import sys; sys.stdout.buffer.write(bytes.fromhex({payload.hex()!r}))'], **kwargs)
        args = argparse.Namespace(issue=123, version=1, accepted_by='fixture',
            accepted_at='2026-09-10T00:00:00Z', approval_reference='fixture')
        with patch.object(sdlc, 'require_command', return_value='gh'), patch.object(sdlc, 'run', side_effect=protocol):
            self.invoke(sdlc.capture_issue_baseline, args)
            json_path = self.repo / 'docs/sdlc/baselines/issue-123/v1.json'
            markdown_path = json_path.with_suffix('.md')
            original = (json_path.read_bytes(), markdown_path.read_bytes())
            record = state.load_json(json_path)
            self.assertEqual(record['issue']['body'], body)
            self.assertEqual(record['issue']['bodySha256'], hashlib.sha256(body.encode('utf-8')).hexdigest())
            self.assertTrue(original[1].endswith(body.encode('utf-8') + b'\n'))
            with self.assertRaises(SetupError): self.invoke(sdlc.capture_issue_baseline, args)
            self.assertEqual((json_path.read_bytes(), markdown_path.read_bytes()), original)

    def test_invalid_utf8_exit_zero_is_never_success(self):
        self.configure('focused', "import sys; sys.stdout.buffer.write(bytes.fromhex('6f726967696e616cff0d0a'))")
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        result = record['commands'][0]
        self.assertEqual(result['returnCode'], 0); self.assertEqual(result['status'], 'passed')
        self.assertEqual(result['decodeStatus'], 'invalid-utf8'); self.assertIsNone(result['output'])
        self.assertEqual((self.repo / result['capture']['path']).read_bytes(), b'original\xff\r\n')
        self.assertFalse(record['passed']); self.assertTrue(state.required_verification_gaps(self.repo))

    def test_infrastructure_failure_reports_original_problem_after_retention(self):
        self.begin_task()
        with (patch.object(sdlc, 'verification_input_identity', side_effect=OSError('specific identity failure')),
              patch.object(sys, 'stderr', new_callable=io.StringIO) as diagnostic):
            with self.assertRaises(SystemExit): self.verify_task()
            self.assertIn('specific identity failure', diagnostic.getvalue())
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertFalse(record['passed'])

    def test_cli_error_flush_failure_preserves_nonzero_status(self):
        args = ['sdlc.py', 'status']
        flushed = []
        class FailingErrorStream(io.StringIO):
            def flush(self):
                flushed.append(True)
                raise OSError('stderr flush failed')
        with (patch.object(sys, 'argv', args),
              patch.object(sdlc, 'load_json', side_effect=OSError('original \u2716')),
              patch.object(sys, 'stderr', FailingErrorStream())):
            self.assertEqual(sdlc.main(), 1)
        self.assertTrue(flushed)

    def test_all_selected_profiles_are_admitted_before_first_command(self):
        policy = state.load_json(self.repo / state.PIPELINE_POLICY_PATH)
        policy['routes']['R0']['requiredProfiles'] = ['focused', 'affected']
        state.write_json_atomically(self.repo / state.PIPELINE_POLICY_PATH, policy)
        self.configure('focused', "import json; from pathlib import Path; "
            "r=json.loads(Path('.sdlc/runtime/verification/affected.json').read_text()); "
            "assert r['status']=='pending' and r['passed'] is False; "
            "p=Path('.sdlc/runtime/runs')/r['taskId']/(r['runId']+'.json'); "
            "assert json.loads(p.read_text())==r")
        self.begin_task(); self.verify_task()
        self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_native_git_scope_selects_new_receipt_schema_and_process_fixture(self):
        runtime = self.repo / '.sdlc/runtime'
        runtime.mkdir(parents=True)
        for relative in ('.sdlc/schemas/verification-run.schema.json',
                         'tests/sdlc/fixtures/verification_process.py'):
            with self.subTest(path=relative):
                base = self.git('rev-parse', 'HEAD').strip()
                destination = self.repo / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes((REPOSITORY / relative).read_bytes() + b'\n')
                self.commit('Isolated relevant input')
                event = runtime / 'event.json'
                event.write_text(json.dumps({'pull_request': {'base': {'sha': base}}}), encoding='utf-8')
                output = runtime / 'selection.txt'
                output.write_text('', encoding='utf-8')
                environment = dict(os.environ, GITHUB_EVENT_NAME='pull_request',
                    GITHUB_EVENT_PATH=str(event), GITHUB_SHA=self.git('rev-parse', 'HEAD').strip(),
                    GITHUB_OUTPUT=str(output))
                environment.pop('GITHUB_STEP_SUMMARY', None)
                result = subprocess.run(['node', str(self.repo / 'scripts/selectPullRequestChecks.js'),
                    '--scope', 'sdlc'], env=environment, capture_output=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(output.read_text(encoding='utf-8'), 'sdlc=true\n')

    def test_recording_failure_after_child_or_at_final_canonical_stops_publication(self):
        self.config['profiles']['focused'] = [
            {'name':'first', 'argv':[sys.executable,'verification_process.py','--hex','66616374730a']},
            {'name':'second', 'argv':[sys.executable,'-c',"from pathlib import Path; Path('.sdlc/runtime/second').touch()"]}]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Two commands for recording faults'); self.begin_task()
        original_write = sdlc.write_json_atomically
        for boundary in ('after-child', 'final-canonical'):
            with self.subTest(boundary=boundary):
                failed = False
                marker = self.repo / '.sdlc/runtime/second'
                marker.unlink(missing_ok=True)
                def fail_at_boundary(path, value):
                    nonlocal failed
                    first = value['commands'][0] if value.get('commands') else None
                    at_boundary = (first and first['returnCode'] == 0 and first['decodeStatus'] == 'pending'
                                   if boundary == 'after-child' else value.get('passed') is True)
                    if failed or (at_boundary and path.parent.name != 'verification'):
                        failed = True
                        raise PermissionError('recording unavailable at ' + boundary)
                    original_write(path, value)
                with patch.object(sdlc, 'write_json_atomically', side_effect=fail_at_boundary):
                    with self.assertRaises(SystemExit): self.verify_task(keep_going=True)
                self.assertTrue(failed)
                current = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
                self.assertFalse(current['passed'])
                self.assertEqual((self.repo / state.verification_output_path(current, 1)).read_bytes(), b'facts\n')
                self.assertEqual(marker.exists(), boundary == 'final-canonical')
                self.assertTrue(state.required_verification_gaps(self.repo))

    def test_native_invalid_executable_is_unavailable_without_invented_output(self):
        invalid = self.repo / 'invalid-executable.exe'
        invalid.write_bytes(b'This is not an executable image.\n')
        invalid.chmod(0o700)
        self.config['profiles']['focused'][0]['argv'] = [str(invalid)]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Invalid native executable'); self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        result = record['commands'][0]
        self.assertEqual(result['resolvedExecutable'], str(invalid))
        self.assertEqual(result['status'], 'unavailable')
        self.assertIsNone(result['returnCode']); self.assertIsNone(result['output'])
        self.assertEqual(record['problems'][0]['phase'], 'spawn')
        self.assertFalse(record['passed'])

    @unittest.skipUnless(os.name == 'posix', 'Native targeted SIGINT is qualified on POSIX; Windows uses caught-exception injection')
    def test_native_sigint_retains_interrupted_receipt(self):
        self.config['profiles']['focused'][0]['argv'] = [sys.executable, 'verification_process.py',
            '--ready', '.sdlc/runtime/ready', '--release', '.sdlc/runtime/release']
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Native signal fixture'); self.begin_task()
        runner = subprocess.Popen([sys.executable, str(self.repo / 'scripts/sdlc.py'), 'verify'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            ready = self.repo / '.sdlc/runtime/ready'
            deadline = time.monotonic() + 15
            while not ready.exists() and runner.poll() is None and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(ready.exists())
            runner.send_signal(signal.SIGINT)
            self.assertNotEqual(runner.wait(timeout=10), 0)
            record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
            self.assertEqual(record['status'], 'interrupted')
            self.assertEqual(record['commands'][0]['status'], 'interrupted')
            self.assertIsInstance(record['commands'][0]['returnCode'], int)
            self.assertFalse(record['passed'])
        finally:
            (self.repo / '.sdlc/runtime/release').touch()
            if runner.poll() is None:
                runner.terminate(); runner.wait(timeout=10)

    def test_reader_rejects_redirected_raw_ancestor(self):
        self.begin_task(); self.verify_task()
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        raw = self.repo / record['commands'][0]['capture']['path']
        preserved = raw.parent.with_name('preserved')
        raw.parent.rename(preserved)
        raw.parent.symlink_to(preserved, target_is_directory=True)
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_reader_rejects_mismatched_run_profile_task_and_nonterminal_pairs(self):
        self.begin_task(); self.verify_task()
        current = self.repo / '.sdlc/runtime/verification/focused.json'
        original = state.load_json(current)
        for field, value in [('runId', 'a' * 32), ('taskId', 'b' * 32), ('profile', 'affected'),
                             ('status', 'running'), ('finishedAt', None), ('expectedCommandCount', 2),
                             ('problems', [{'phase':'capture','commandOrdinal':1,'exceptionType':None,'message':'incomplete'}])]:
            with self.subTest(field=field):
                changed = copy.deepcopy(original); changed[field] = value
                state.write_json_atomically(current, changed)
                state.write_json_atomically(self.repo / state.verification_run_path(original), changed)
                self.assertTrue(state.required_verification_gaps(self.repo))

    def test_default_unicode_success_records_actual_runtime_and_empty_output_is_captured(self):
        self.config['profiles']['focused'] = [
            {'name': 'unicode', 'argv': [sys.executable, 'verification_process.py']},
            {'name': 'empty', 'argv': [sys.executable, 'verification_process.py', '--hex=']}]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        self.commit('Exact streams'); self.begin_task()
        environment = dict(os.environ, PYTHONUTF8='0')
        environment.pop('PYTHONIOENCODING', None)
        result = subprocess.run(['node', str(REPOSITORY / 'scripts/runRepositoryPython.js'),
            str(self.repo / 'scripts/sdlc.py'), 'verify'], env=environment, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        record = state.load_json(self.repo / '.sdlc/runtime/verification/focused.json')
        self.assertEqual(record['runtime']['utf8Mode'], 1)
        self.assertEqual(record['runtime']['stdoutEncoding'], 'utf-8')
        self.assertEqual(record['commands'][0]['output'], '\u2716 \u6f22\u5b57 \U0001f600\n')
        empty = record['commands'][1]
        self.assertEqual(empty['output'], '')
        self.assertEqual(empty['capture']['byteLength'], 0)
        self.assertEqual(empty['capture']['sha256'], hashlib.sha256(b'').hexdigest())
        self.assertEqual((self.repo / empty['capture']['path']).read_bytes(), b'')
        self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_early_failure_does_not_claim_unexecuted_checks_passed(self):
        self.config['profiles']['focused'] = [
            {'name':'fails', 'argv':[sys.executable,'-c','raise SystemExit(2)']},
            {'name':'not-reached', 'argv':[sys.executable,'-c',"from pathlib import Path; Path('bad-marker').touch()"]}]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config); self.commit('Two commands')
        self.begin_task()
        with self.assertRaises(SystemExit): self.verify_task()
        self.assertFalse((self.repo / 'bad-marker').exists())
        self.assertTrue(state.required_verification_gaps(self.repo))

    def test_empty_profile_is_rejected_by_schema(self):
        self.config['profiles']['focused'] = []
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        with self.assertRaises(SetupError): self.begin_task()

    def test_non_string_argv_is_rejected_by_schema(self):
        self.config['profiles']['focused'][0]['argv'] = [sys.executable, 23]
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        with self.assertRaises(SetupError): self.begin_task()

    def test_profile_name_cannot_escape_output_directory(self):
        self.config['profiles']['../escape'] = self.config['profiles']['focused']
        state.write_json_atomically(self.repo / state.VERIFICATION_CONFIG_PATH, self.config)
        with self.assertRaises(SetupError): self.begin_task()

    def test_unknown_required_profile_is_rejected(self):
        policy = state.load_json(self.repo / state.PIPELINE_POLICY_PATH)
        policy['routes']['R0']['requiredProfiles'] = ['absent']
        state.write_json_atomically(self.repo / state.PIPELINE_POLICY_PATH, policy)
        with self.assertRaises(SetupError): self.begin_task()

    def test_handoff_refuses_missing_evidence(self):
        self.begin_task()
        with self.assertRaises(SetupError): self.disposition(completed=True)
        self.assertTrue((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_verified_handoff_preserves_runs_and_removes_only_active_pointer(self):
        self.begin_task(); self.verify_task(); self.disposition(completed=True)
        self.assertFalse((self.repo / state.ACTIVE_TASK_PATH).exists())
        self.assertTrue(list((self.repo / state.RUNTIME_DIRECTORY / 'runs').rglob('*.json')))
        self.assertTrue(list((self.repo / state.RUNTIME_DIRECTORY / 'handoffs').glob('*.json')))

    def test_pause_is_explicitly_incomplete_and_resume_invalidates_old_evidence(self):
        self.begin_task(); self.verify_task()
        original_id = state.load_json(self.repo / state.ACTIVE_TASK_PATH)['taskId']
        self.disposition(completed=False)
        self.assertTrue(state.load_json(self.repo / state.ACTIVE_TASK_PATH)['paused'])
        with self.assertRaises(SetupError): self.verify_task()
        self.invoke(sdlc.resume_task, argparse.Namespace(decision_reference='owner-decision'))
        self.assertNotEqual(state.load_json(self.repo / state.ACTIVE_TASK_PATH)['taskId'], original_id)
        self.assertTrue(state.required_verification_gaps(self.repo))
        self.verify_task(); self.assertEqual(state.required_verification_gaps(self.repo), [])

    def test_paused_task_cannot_handoff_as_complete(self):
        self.begin_task(); self.verify_task(); self.disposition(completed=False)
        with self.assertRaises(SetupError): self.disposition(completed=True)

    def test_input_path_traversal_is_rejected(self):
        with self.assertRaises(SetupError): state.require_repository_file(self.repo, '../outside.txt')

    def test_symlinked_state_parent_is_rejected(self):
        other_directory = self.repo / 'other'; other_directory.mkdir()
        runtime = self.repo / state.RUNTIME_DIRECTORY
        runtime.symlink_to(other_directory, target_is_directory=True)
        with self.assertRaises(SetupError): self.begin_task()
        self.assertFalse((other_directory / 'active.json').exists())

    def test_stop_hook_requests_one_continuation_then_honest_blocker(self):
        self.begin_task()
        command = [sys.executable, str(self.repo / 'scripts/sdlc_stop_gate.py')]
        first = subprocess.run(command, input='{}', text=True, capture_output=True)
        self.assertEqual(first.returncode, 2)
        second = subprocess.run(command, input='{"stop_hook_active":true}', text=True, capture_output=True)
        self.assertEqual(second.returncode, 0)
        self.assertIn('no completion', json.loads(second.stdout)['systemMessage'])
        self.assertTrue((self.repo / state.ACTIVE_TASK_PATH).exists())

    def test_stop_hook_accepts_current_r0_without_full_profile(self):
        self.begin_task(); self.verify_task()
        result = subprocess.run([sys.executable, str(self.repo / 'scripts/sdlc_stop_gate.py')],
                                input='{}', text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {})

    def test_native_hook_preserves_repository_root_arguments_stdin_and_exit_status(self):
        (self.repo / 'package.json').write_text('{"type":"module"}')
        (self.repo / 'scripts/runRepositoryPython.js').write_text(
            'import {readFileSync} from "node:fs";'
            'const input=JSON.parse(readFileSync(0,"utf8"));'
            'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2),input}));'
            'process.exitCode=input.exitCode;')
        command = set_up_sdlc.sdlc_stop_hook()['hooks'][0]['commandWindows' if os.name == 'nt' else 'command']
        # Codex's Windows hook consumer uses cmd.exe /C with a raw outer-quoted
        # command. Launching PowerShell here would hide a missing interpreter.
        invocation = (f'"{os.environ["COMSPEC"]}" /C "{command}"' if os.name == 'nt'
                      else ['sh', '-c', command])
        for exit_code in (0, 2):
            with self.subTest(exit_code=exit_code):
                hook_input = {'stop_hook_active': False, 'exitCode': exit_code}
                result = subprocess.run(invocation,cwd=self.repo/'scripts',input=json.dumps(hook_input),
                                        text=True,capture_output=True,timeout=30)
                self.assertEqual(result.returncode, exit_code, result.stderr)
                payload = json.loads(result.stdout)
                self.assertEqual(set(payload), {'cwd', 'args', 'input'})
                self.assertTrue(Path(payload['cwd']).is_absolute())
                self.assertTrue(Path(payload['cwd']).samefile(self.repo))
                self.assertEqual(payload['args'], ['scripts/sdlc_stop_gate.py'])
                self.assertEqual(payload['input'], hook_input)

    def test_unknown_end_command_does_not_execute_a_transition(self):
        result = subprocess.run([sys.executable, str(self.repo / 'scripts/sdlc.py'), 'end'],
                                text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)


class PullRequestValidationTests(unittest.TestCase):
    def setUp(self):
        self.baseline = baseline_document()
        self.issue = {'number':123,'title':self.baseline['issue']['title'],
                      'body':self.baseline['issue']['body'],
                      'labels':[{'name':'risk:R2'},{'name':'state:accepted'}]}
        self.fields = {'issue':'#123','risk':'R2', 'acceptance':'AC-001', 'baseline_only':'no',
                       'baseline':'docs/sdlc/baselines/issue-123/v1.json', 'new_functionality':'no','software_selection':'none'}

    def validate_fixture_pr(self, *, paths=None, baseline=None, prior=None, existing=False):
        return pull_request_validation.validate_pull_request_linkage(REPOSITORY,self.fields,'example/service',
             self.issue, paths if paths is not None else ['src/claim_status.py'],
             baseline if baseline is not None else self.baseline,
             prior if prior is not None else self.baseline,existing)

    def test_r2_prior_baseline_passes(self): self.assertEqual(self.validate_fixture_pr(), [])

    def test_r0_can_use_task_or_pr_without_issue(self):
        fields = {'issue':'none','risk':'R0','acceptance':'none','baseline_only':'no','baseline':'none','new_functionality':'no','software_selection':'none'}
        errors = pull_request_validation.validate_pull_request_linkage(REPOSITORY,fields,'example/service',None,
                    ['docs/usage.md'],None,None)
        self.assertEqual(errors, [])

    def test_r1_can_use_accepted_brief_without_separate_baseline(self):
        fields = {'issue':'none','risk':'R1','acceptance':'small accepted task','baseline_only':'no','baseline':'none','new_functionality':'no','software_selection':'none'}
        self.assertEqual(pull_request_validation.validate_pull_request_linkage(REPOSITORY,fields,'example/service',None,
                          ['src/parser.py'],None,None), [])

    def test_r1_can_add_new_baseline_in_implementation_pr(self):
        self.fields['risk']='R1'; self.issue['labels']=[{'name':'risk:R1'}]
        self.assertEqual(self.validate_fixture_pr(paths=['src/claim_status.py',self.fields['baseline']],prior={}), [])

    def test_r2_cannot_add_baseline_in_implementation_pr(self):
        self.assertTrue(self.validate_fixture_pr(paths=['src/claim_status.py',self.fields['baseline']],prior={}))

    def test_existing_baseline_changes_are_rejected(self): self.assertTrue(self.validate_fixture_pr(existing=True))

    def test_body_tamper_is_rejected(self):
        changed = copy.deepcopy(self.baseline); changed['issue']['body']='new accepted?'
        self.assertTrue(self.validate_fixture_pr(baseline=changed))

    def test_live_title_change_requires_reacceptance(self):
        self.issue['title']='Different intent'; self.assertTrue(self.validate_fixture_pr())

    def test_live_body_change_requires_reacceptance(self):
        self.issue['body']+=' Additional requirement'; self.assertTrue(self.validate_fixture_pr())

    def test_changed_issue_state_is_rejected(self):
        self.issue['labels'].append({'name':'state:changed'}); self.assertTrue(self.validate_fixture_pr())

    def test_multiple_risk_labels_are_rejected(self):
        self.issue['labels'].append({'name':'risk:R0'}); self.assertTrue(self.validate_fixture_pr())

    def test_unknown_acceptance_id_is_rejected(self):
        self.fields['acceptance']='AC-999'; self.assertTrue(self.validate_fixture_pr())

    def test_baseline_path_version_must_match_record(self):
        self.fields['baseline']='docs/sdlc/baselines/issue-123/v2.json'; self.assertTrue(self.validate_fixture_pr())

    def test_baseline_path_issue_must_match_record(self):
        self.fields['baseline']='docs/sdlc/baselines/issue-999/v1.json'; self.assertTrue(self.validate_fixture_pr())

    def test_malformed_baseline_is_reported_not_crashed(self):
        self.assertTrue(self.validate_fixture_pr(baseline={'issue': []}))

    def test_baseline_only_pr_cannot_include_program_changes(self):
        self.fields['baseline_only']='yes'
        self.issue['labels']=[{'name':'risk:R2'},{'name':'state:ready-to-baseline'}]
        self.assertTrue(self.validate_fixture_pr())

    def test_new_functionality_pr_without_research_is_blocked(self):
        self.fields['new_functionality'] = 'yes'
        for reference in ('', '   ', 'none', 'pending', '-', 'N/A'):
            self.fields['software_selection'] = reference
            self.assertTrue(any('REU-01' in error for error in self.validate_fixture_pr()))

    def test_new_functionality_pr_with_reference_passes_presence_only(self):
        self.fields.update(new_functionality='yes', software_selection='issue-123#selection-v1')
        self.assertEqual(self.validate_fixture_pr(), [])

    def test_pr_requires_functionality_and_selection_declarations(self):
        body = 'Change issue: none\nAccepted baseline: none\nRisk class: R0\nAcceptance IDs implemented: none\nBaseline-only: no\n'
        with self.assertRaises(SetupError):
            pull_request_validation.parse_pull_request_fields(body)


    def test_crlf_machine_fields_are_accepted(self):
        body='Change issue: none\r\nAccepted baseline: none\r\nRisk class: R0\r\nAcceptance IDs implemented: none\r\nBaseline-only: no\r\nNew functionality: no\r\nSoftware selection: none\r\n'
        fields = pull_request_validation.parse_pull_request_fields(body)
        self.assertEqual(fields['risk'], 'R0')
        self.assertEqual(fields['issue'], 'none')

    def test_duplicate_machine_field_is_rejected(self):
        body='Change issue: none\nAccepted baseline: none\nRisk class: R0\nRisk class: R2\nAcceptance IDs implemented: none\nBaseline-only: no\nNew functionality: no\nSoftware selection: none\n'
        with self.assertRaises(SetupError): pull_request_validation.parse_pull_request_fields(body)


class SkillMetadataTests(unittest.TestCase):
    def test_local_skill_installation_and_explicit_policy_preserve_other_metadata(self):
        import yaml
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            (repo / 'existing-directory').mkdir()
            repo = repo / 'existing-directory' / '..'
            self.assertNotEqual(repo, repo.resolve())
            subprocess.run(['git', 'init', '-q', str(repo)], check=True)
            (repo / '.gitignore').write_text('.agents/skills/\n.claude/skills/\n')
            local_source = repo / '.sdlc/skills/example'
            (local_source / 'agents').mkdir(parents=True)
            (local_source / 'SKILL.md').write_text('---\nname: example\ndescription: A bounded fixture.\n---\n')
            (local_source / 'agents/openai.yaml').write_text('interface: {display_name: "Example"}\npolicy: {allow_implicit_invocation: true}\n')
            with redirect_stdout(io.StringIO()):
                discovered = skill_setup.discover_local_skills(repo)
                skill_setup.install_local_skills(repo, discovered, ('codex','claude-code'))
                skill_setup.configure_skill_invocation_policies(repo, set(discovered), ('codex','claude-code'))
            for activation in ('.agents/skills','.claude/skills'):
                skill = repo / activation / 'example'
                self.assertEqual((skill / 'SKILL.md').read_text(), (local_source / 'SKILL.md').read_text())
                self.assertFalse(yaml.safe_load((skill / 'agents/openai.yaml').read_text())['policy']['allow_implicit_invocation'])
                self.assertEqual(yaml.safe_load((skill / 'agents/openai.yaml').read_text())['interface']['display_name'],'Example')

    def test_generated_root_symlink_is_rejected_before_materialisation(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            preserved = repo / 'preserved'; preserved.mkdir()
            (preserved / 'user-work.txt').write_text('keep this')
            (repo / '.agents').mkdir()
            (repo / '.agents/skills').symlink_to(preserved, target_is_directory=True)
            with self.assertRaises(SetupError): skill_setup.selected_roots(repo, ('codex',))
            self.assertEqual((preserved / 'user-work.txt').read_text(), 'keep this')

    def test_redirected_local_skill_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            repo = Path(temporary)
            (repo / '.sdlc').mkdir(); (repo / 'elsewhere').mkdir()
            (repo / '.sdlc/skills').symlink_to(repo / 'elsewhere', target_is_directory=True)
            with self.assertRaises(SetupError): skill_setup.discover_local_skills(repo)

    def test_native_yaml_roundtrip_preserves_other_metadata(self):
        import yaml
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'openai.yaml'
            path.write_text('interface: {display_name: "Example", nested: [one, two]}\npolicy: {allow_implicit_invocation: true}\ndependencies: {tools: []}\n')
            original=yaml.safe_load(path.read_text())
            skill_setup.set_openai_invocation_policy(path,'example',False)
            changed=yaml.safe_load(path.read_text())
            original['policy']['allow_implicit_invocation']=False
            self.assertEqual(changed,original)

    def test_unsafe_yaml_tag_is_not_executed(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'openai.yaml'
            path.write_text('!!python/object/apply:builtins.print ["unsafe"]\n')
            with self.assertRaises(SetupError): skill_setup.set_openai_invocation_policy(path,'example',False)

    def test_invalid_policy_mapping_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'openai.yaml'; path.write_text('policy: [not, a, mapping]\n')
            with self.assertRaises(SetupError): skill_setup.set_openai_invocation_policy(path,'example',False)


if __name__ == '__main__': unittest.main(verbosity=2)
