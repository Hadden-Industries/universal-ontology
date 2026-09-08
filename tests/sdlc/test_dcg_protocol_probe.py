"""Tests of the inert probe harness, NOT DCG's classifier or licence clearance."""
from __future__ import annotations
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import probe_dcg_hook_protocol as probe_tool


def reply(decision='deny', code=0):
    output = '' if decision == 'allow' else json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse', 'permissionDecision': decision,
        'permissionDecisionReason': 'Fixture policy decision'}})
    return {'exitCode': code, 'stdout': output, 'stderr': '', 'error': None}


class HookReplyTests(unittest.TestCase):
    def test_zero_and_empty_is_allow(self):
        self.assertEqual(probe_tool.decode_hook_decision(reply('allow')), 'allow')

    def test_zero_with_native_json_is_deny(self):
        self.assertEqual(probe_tool.decode_hook_decision(reply()), 'deny')

    def test_exit_two_is_failure_not_deny(self):
        self.assertEqual(probe_tool.decode_hook_decision(reply(code=2)), 'indeterminate')

    def test_invalid_json_is_not_allow(self):
        item = reply(); item['stdout'] = 'unexpected diagnostic'
        self.assertEqual(probe_tool.decode_hook_decision(item), 'indeterminate')

    def test_unknown_claude_metadata_is_not_accepted_as_codex_contract(self):
        item = reply(); data = json.loads(item['stdout']); data['hookSpecificOutput']['ruleId'] = 'fixture'
        item['stdout'] = json.dumps(data)
        self.assertEqual(probe_tool.decode_hook_decision(item), 'indeterminate')

    def test_empty_reason_is_indeterminate(self):
        item = reply(); data = json.loads(item['stdout']); data['hookSpecificOutput']['permissionDecisionReason'] = ''
        item['stdout'] = json.dumps(data)
        self.assertEqual(probe_tool.decode_hook_decision(item), 'indeterminate')

    def test_timeout_is_not_permission(self):
        item = reply('allow'); item['error'] = 'timeout'
        self.assertEqual(probe_tool.decode_hook_decision(item), 'indeterminate')

    def test_native_ask_is_not_misreported_as_approval(self):
        self.assertEqual(probe_tool.decode_hook_decision(reply('ask')), 'indeterminate')


class ProbeWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='dcg-probe-tests-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.binary = self.root / 'dcg-fixture'
        self.binary.write_text('not executable; native calls must be stubbed')
        self.config = self.root / 'config.toml'
        self.config.write_text('[general]\nfail_closed = true\n')
        self.cases = self.root / 'cases.json'
        self.cases.write_text(json.dumps([
            {'id':'safe', 'command':'git status', 'expectedDecision':'allow'},
            {'id':'blocked', 'command':'git reset --hard', 'expectedDecision':'deny'}]))
        self.schema = {'$schema': 'https://json-schema.org/draft/2020-12/schema',
            'type':'object','required':['general'], 'properties': {'general': {
                'type':'object', 'required':['fail_closed'],
                'properties':{'fail_closed':{'type':'boolean'}}}}}
        self.calls=[]

    def native_stub(self, binary, arguments, directory, environment, stdin=None, timeout=20):
        self.calls.append((arguments, stdin, environment))
        base = {'argv':[str(binary), *arguments], 'exitCode':0, 'stdout':'', 'stderr':'', 'error':None}
        if arguments == ['--version']: base['stdout'] = 'dcg 0.14.0\n'
        elif arguments == ['config','schema']: base['stdout'] = json.dumps(self.schema)
        elif arguments == ['config','--format','json']: base['stdout'] = '{}'
        elif arguments == []:
            payload=json.loads(stdin)
            # Explicit fixture, not a command classifier: only these two inputs exist.
            self.assertIn(payload['tool_input']['command'], ('git status','git reset --hard'))
            base.update(reply('allow' if payload['tool_input']['command']=='git status' else 'deny'))
        else: self.fail('Unexpected executable invocation')
        return base

    def run_probe(self, stub=None):
        with patch.object(probe_tool, 'invoke_native', side_effect=stub or self.native_stub):
            return probe_tool.probe(self.binary, self.config, self.cases)

    def test_protocol_pass_never_claims_host_interception(self):
        result=self.run_probe()
        self.assertTrue(result['passed']); self.assertFalse(result['hostInterceptionTested'])
        self.assertEqual(len(result['cases']),2)

    def test_command_strings_are_stdin_data_not_executable_arguments(self):
        self.run_probe()
        hooks=[call for call in self.calls if call[0]==[]]
        self.assertEqual(len(hooks),2)
        self.assertTrue(all(json.loads(call[1])['tool_name']=='Bash' for call in hooks))
        self.assertTrue(all(json.loads(call[1])['turn_id'] for call in hooks))
        self.assertNotIn(['git','reset','--hard'], [call[0] for call in self.calls])

    def test_schema_comes_from_consumer_and_rejects_invalid_candidate(self):
        self.config.write_text('[general]\nfail_closed = "false"\n')
        result=self.run_probe()
        self.assertFalse(result['passed']); self.assertEqual(result['status'],'failed')
        self.assertEqual(result['cases'],[])
        self.assertIn('ValidationError',result['error'])

    def test_native_deny_exit_zero_does_not_satisfy_expected_allow(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==[]: value.update(reply())
            return value
        result=self.run_probe(stub)
        self.assertFalse(result['passed'])

    def test_wrong_version_stops_before_probes(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==['--version']: value['stdout']='dcg 0.13.0'
            return value
        result=self.run_probe(stub)
        self.assertFalse(result['passed']); self.assertEqual(len(self.calls),1)

    def test_missing_binary_is_not_run_and_not_success(self):
        result=probe_tool.probe(self.root/'absent',self.config,self.cases)
        self.assertFalse(result['passed']); self.assertEqual(result['status'],'not-run')

    def test_effective_configuration_failure_stops_probes(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==['config','--format','json']: value['exitCode']=1
            return value
        result=self.run_probe(stub)
        self.assertFalse(result['passed']); self.assertEqual(result['cases'],[])

    def test_native_error_is_preserved_not_silently_skipped(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==[]: value.update({'exitCode':None,'error':'TimeoutExpired'})
            return value
        result=self.run_probe(stub)
        self.assertFalse(result['passed'])
        self.assertEqual(result['cases'][0]['nativeResult']['error'],'TimeoutExpired')

    def test_safe_command_noise_is_reported_as_mismatch(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==[]: value['stderr']='unexpected safe-path output'
            return value
        self.assertFalse(self.run_probe(stub)['passed'])

    def test_environment_does_not_inherit_secrets_or_bypass(self):
        with patch.dict(os.environ,{'OPENAI_API_KEY':'not-real', 'GH_TOKEN':'not-real',
                                   'DCG_BYPASS':'1','DCG_DISABLE':'strict_git'}):
            self.run_probe()
        env=self.calls[0][2]
        self.assertNotIn('OPENAI_API_KEY',env); self.assertNotIn('GH_TOKEN',env)
        self.assertNotIn('DCG_BYPASS',env); self.assertNotIn('DCG_DISABLE',env)
        self.assertEqual(env['DCG_SELF_HEAL_HOOK'],'0')
        self.assertNotEqual(env['HOME'], os.environ.get('HOME'))

    def test_configuration_edit_during_probe_invalidates_pass(self):
        def stub(*args,**kwargs):
            value=self.native_stub(*args,**kwargs)
            if args[1]==[]: self.config.write_text('[general]\nfail_closed = false\n')
            return value
        result=self.run_probe(stub)
        self.assertFalse(result['passed']); self.assertFalse(result['inputsUnchanged'])

    def test_duplicate_case_identity_is_rejected_before_native_invocation(self):
        cases=json.loads(self.cases.read_text()); cases[1]['id']=cases[0]['id']
        self.cases.write_text(json.dumps(cases))
        result=self.run_probe()
        self.assertFalse(result['passed']); self.assertEqual(self.calls,[])

    def test_existing_output_is_not_overwritten(self):
        output=self.root/'existing.json';output.write_text('keep this user evidence')
        result=subprocess.run([sys.executable,str(ROOT/'scripts/probe_dcg_hook_protocol.py'),
            '--dcg',str(self.binary),'--config',str(self.config),'--output',str(output)],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(output.read_text(),'keep this user evidence')

    def test_consumer_schema_wrong_shape_is_recorded_as_failure(self):
        self.schema=[]
        result=self.run_probe()
        self.assertFalse(result['passed']); self.assertIn('schema object', result['error'])

    def test_consumer_schema_invalidity_stops_as_failed(self):
        self.schema={'type':'not-a-schema-type'}
        result=self.run_probe()
        self.assertFalse(result['passed']); self.assertIn('SchemaError',result['error'])


if __name__=='__main__': unittest.main()
