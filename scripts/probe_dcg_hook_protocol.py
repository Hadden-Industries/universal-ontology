#!/usr/bin/env python3
"""Probe a supplied DCG binary with command strings as DATA, never execute them.

Not a runtime guard, installer, host-interception test or approval mechanism.
Reuses `dcg config schema` for configuration validation. All DCG hook invocations
use an isolated home/working directory, not the operator's actual policy state.
Use real-host acceptance separately before retiring existing controls.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import tempfile
from typing import Any
import tomllib

import jsonschema

REPOSITORY = Path(__file__).resolve().parents[1]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def isolated_environment(directory: Path, config: Path) -> dict[str, str]:
    """Do not inherit secrets, DCG bypasses or the operator's home/config."""
    env = {key: value for key, value in os.environ.items()
           if key.upper() in {'PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT',
                              'LANG', 'LC_ALL', 'LC_CTYPE'}}
    for key in ('HOME', 'USERPROFILE', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME',
                'XDG_STATE_HOME', 'XDG_CACHE_HOME', 'APPDATA', 'LOCALAPPDATA',
                'TMP', 'TEMP', 'TMPDIR'):
        location = directory / key.lower()
        location.mkdir()
        env[key] = str(location)
    env.update({'DCG_CONFIG': str(config), 'DCG_SELF_HEAL_HOOK': '0',
                'NO_COLOR': '1', 'TERM': 'dumb', 'CI': '1',
                'GIT_CONFIG_NOSYSTEM': '1', 'GIT_TERMINAL_PROMPT': '0'})
    return env


def invoke_native(binary: Path, arguments: list[str], directory: Path,
                  environment: dict[str, str], stdin: str | None = None,
                  timeout: float = 20) -> dict[str, Any]:
    """Only binary plus fixed CLI arguments execute; probe commands stay on stdin."""
    argv = [str(binary), *arguments]
    try:
        result = subprocess.run(argv, input=stdin, cwd=directory, env=environment,
                                text=True, encoding='utf-8', errors='replace',
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=timeout, check=False, shell=False)
        return {'argv': argv, 'exitCode': result.returncode,
                'stdout': result.stdout, 'stderr': result.stderr, 'error': None}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {'argv': argv, 'exitCode': None, 'stdout': '', 'stderr': '',
                'error': f'{type(exc).__name__}: {exc}'}


def decode_hook_decision(result: dict[str, Any]) -> str:
    """Assert the documented native Codex reply, not the shell command's semantics."""
    if result.get('error') or result.get('exitCode') != 0:
        return 'indeterminate'
    text = result.get('stdout', '').strip()
    if not text:
        return 'allow'
    try:
        value = json.loads(text)
    except (ValueError, TypeError):
        return 'indeterminate'
    if not isinstance(value, dict) or set(value) != {'hookSpecificOutput'}:
        return 'indeterminate'
    output = value['hookSpecificOutput']
    if (not isinstance(output, dict)
        or set(output) != {'hookEventName', 'permissionDecision', 'permissionDecisionReason'}
        or output.get('hookEventName') != 'PreToolUse'
        or output.get('permissionDecision') != 'deny'
        or not isinstance(output.get('permissionDecisionReason'), str)
        or not output['permissionDecisionReason'].strip()):
        return 'indeterminate'
    return 'deny'


def load_cases(path: Path) -> list[dict[str, str]]:
    value = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(value, list) or not value:
        raise ValueError('Probe cases must be a non-empty JSON array.')
    seen: set[str] = set()
    for item in value:
        if (not isinstance(item, dict) or set(item) != {'id', 'command', 'expectedDecision'}
            or not isinstance(item['id'], str) or not item['id']
            or not isinstance(item['command'], str) or not item['command']
            or item['expectedDecision'] not in ('allow', 'deny')
            or item['id'] in seen):
            raise ValueError('Each probe needs a unique id, command string and allow/deny expectation.')
        seen.add(item['id'])
    return value


def require_json_success(result: dict[str, Any], operation: str) -> Any:
    if result['error'] or result['exitCode'] != 0:
        raise ValueError(f'{operation} failed; inspect the recorded native result.')
    try:
        return json.loads(result['stdout'])
    except (ValueError, TypeError) as exc:
        raise ValueError(f'{operation} did not emit JSON.') from exc


def probe(binary: Path, config_path: Path, cases_path: Path,
          expected_version: str = '0.14.0') -> dict[str, Any]:
    report: dict[str, Any] = {
        'schemaVersion': 1, 'kind': 'dcg-hook-protocol-probe',
        'status': 'not-run', 'passed': False, 'hostInterceptionTested': False,
        'configScope': 'explicit candidate config in isolated test home, NOT deployed effective state',
        'runtime': {'python': platform.python_version(), 'platform': platform.platform()},
        'nativeCalls': [], 'cases': [],
        'limitations': ['Does not execute candidate command strings.',
                        'Does not install/register/trust a hook or test actual Codex dispatch.',
                        'Native system configuration may still contribute; inspect effective output.',
                        'Does not reproduce a real rebase, active interactive session or production resources.',
                        'Does not authenticate a binary, human decision or deployment acceptance.']}
    try:
        binary = binary.resolve(strict=True)
        config_path = config_path.resolve(strict=True)
        cases_path = cases_path.resolve(strict=True)
        if not binary.is_file() or not config_path.is_file() or not cases_path.is_file():
            raise ValueError('Binary, config and cases must be existing regular files.')
        config_raw = config_path.read_bytes()
        config_document = tomllib.loads(config_raw.decode('utf-8'))
        cases = load_cases(cases_path)
        report['identity'] = {
            'binary': str(binary), 'binarySha256': sha256_bytes(binary.read_bytes()),
            'candidateConfigSha256': sha256_bytes(config_raw),
            'casesSha256': sha256_bytes(cases_path.read_bytes()),
            'probeSha256': sha256_bytes(Path(__file__).read_bytes()),
            'expectedVersion': expected_version}
        with tempfile.TemporaryDirectory(prefix='dcg-protocol-probe-') as temp:
            root = Path(temp)
            candidate = root / 'candidate-config.toml'
            candidate.write_bytes(config_raw)
            env = isolated_environment(root, candidate)
            work = root / 'work'; work.mkdir()
            version = invoke_native(binary, ['--version'], work, env)
            report['nativeCalls'].append(version)
            if (version['error'] or version['exitCode'] != 0
                or expected_version not in version['stdout'].strip().split()):
                raise ValueError('Native version did not match the explicitly expected version.')
            schema_call = invoke_native(binary, ['config', 'schema'], work, env)
            report['nativeCalls'].append(schema_call)
            schema = require_json_success(schema_call, 'dcg config schema')
            if not isinstance(schema, (dict, bool)):
                raise ValueError('dcg config schema must emit a schema object or boolean.')
            validator = jsonschema.validators.validator_for(schema)
            validator.check_schema(schema)
            validator(schema, format_checker=jsonschema.FormatChecker()).validate(config_document)
            report['identity']['nativeSchemaSha256'] = sha256_bytes(schema_call['stdout'].encode())
            effective = invoke_native(binary, ['config', '--format', 'json'], work, env)
            report['nativeCalls'].append(effective)
            effective_document = require_json_success(effective, 'dcg config --format json')
            if not isinstance(effective_document, dict):
                raise ValueError('dcg effective configuration must be a JSON object.')
            # Keep native output unchanged: no private recreation of DCG precedence/packs logic.
            for case in cases:
                payload = {'session_id': 'sdlc-protocol-probe',
                           'turn_id': 'protocol-' + case['id'],
                           'hook_event_name': 'PreToolUse', 'tool_name': 'Bash',
                           'tool_input': {'command': case['command']},
                           'tool_use_id': 'call-' + case['id'], 'cwd': str(work)}
                response = invoke_native(binary, [], work, env,
                                         json.dumps(payload) + '\n')
                decision = decode_hook_decision(response)
                silent_allow = decision != 'allow' or not response['stderr'].strip()
                report['cases'].append({**case, 'observedDecision': decision,
                    'passed': decision == case['expectedDecision'] and silent_allow,
                    'payload': payload, 'nativeResult': response})
            unchanged = (candidate.read_bytes() == config_raw
                         and config_path.read_bytes() == config_raw
                         and sha256_bytes(binary.read_bytes()) == report['identity']['binarySha256']
                         and sha256_bytes(cases_path.read_bytes()) == report['identity']['casesSha256'])
            report['inputsUnchanged'] = unchanged
            report['passed'] = unchanged and all(item['passed'] for item in report['cases'])
            report['status'] = 'passed' if report['passed'] else 'failed'
    except (OSError, ValueError, jsonschema.exceptions.SchemaError,
            jsonschema.exceptions.ValidationError) as exc:
        report['error'] = f'{type(exc).__name__}: {exc}'
        report['status'] = 'not-run' if not report['nativeCalls'] else 'failed'
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dcg', type=Path, required=True, help='Approved native executable path.')
    parser.add_argument('--config', type=Path, required=True, help='Reviewed candidate TOML, not a live bypass.')
    parser.add_argument('--cases', type=Path,
                        default=REPOSITORY / '.sdlc/dcg/hook-probe-cases.json')
    parser.add_argument('--expected-version', default='0.14.0')
    parser.add_argument('--output', type=Path, required=True, help='New report path; existing files are never overwritten.')
    args = parser.parse_args()
    # Check first so a typo cannot replace user data after a lengthy run.
    if args.output.exists() or args.output.is_symlink():
        parser.error('Output already exists. Supply a new run-specific report path.')
    report = probe(args.dcg, args.config, args.cases, args.expected_version)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(report, output, indent=2); output.write('\n')
    except OSError as exc:
        print(f'Cannot preserve report: {exc}', file=sys.stderr)
        return 2
    print(f"Native protocol: {report['status']}; actual host interception: NOT TESTED. Report: {args.output}")
    return 0 if report['passed'] else (2 if report['status'] == 'not-run' else 1)


if __name__ == '__main__':
    raise SystemExit(main())
