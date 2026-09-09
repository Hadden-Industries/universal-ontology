"""Behavioural tests of local pipeline controls, not proof of agent compliance."""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

REPOSITORY = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY / 'scripts'))
import sdlc
import _sdlc_state as state
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
        (self.repo / 'switch.txt').write_text('corrected fixture')
        self.verify_task()
        records = [state.load_json(path) for path in (self.repo / state.RUNTIME_DIRECTORY / 'runs').rglob('*.json')]
        self.assertEqual(sorted(record['passed'] for record in records), [False, True])
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
