"""Shared JSON validation, verification-input identity and local evidence routing.

These checks are development guardrails, not an adversarial filesystem sandbox or
an attestation service. Human approval and trusted CI remain separate controls.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from itertools import islice
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import SchemaError

from _commands import SetupError, require_command

RUNTIME_DIRECTORY = Path('.sdlc/runtime')
ACTIVE_TASK_PATH = RUNTIME_DIRECTORY / 'active.json'
PIPELINE_POLICY_PATH = Path('.sdlc/pipeline-policy.json')
VERIFICATION_CONFIG_PATH = Path('.sdlc/verification.json')


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise SetupError(f'Cannot read JSON {path}: {exc}') from exc


def validate_document(repo: Path, schema_name: str, document: Any) -> None:
    """Validate with native JSON Schema; report bounded schema-owned diagnostics."""
    schema = load_json(repo / '.sdlc/schemas' / schema_name)
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as exc:
        raise SetupError(f'Invalid maintained schema {schema_name}.') from exc
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = list(islice(validator.iter_errors(document), 6))
    if errors:
        # Native messages, instance paths and even str(error) can disclose values
        # or arbitrary document keys. Only locations in the maintained schema
        # and native constraint keywords belong in these public diagnostics.
        diagnostics = [
            (f'{json.dumps(list(error.absolute_schema_path))}: {error.validator}')[:240]
            for error in errors[:5]
        ]
        if len(errors) > 5:
            diagnostics.append('Additional validation errors omitted.')
        raise SetupError(f'Schema validation failed ({schema_name}): ' + '; '.join(diagnostics))


def reject_redirected_path(path: Path) -> None:
    """Reject existing symlink/junction components before local evidence I/O."""
    for component in (path, *path.parents):
        if component.is_symlink() or component.is_junction():
            raise SetupError(f'Refusing redirected state path: {component}')


def write_json_atomically(path: Path, value: Any) -> None:
    """Atomically write local JSON state, rejecting existing path redirections."""
    reject_redirected_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as output:
            json.dump(value, output, indent=2, sort_keys=True)
            output.write('\n')
        os.replace(temporary_name, path)
    finally:
        primary_error = sys.exception()
        try:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)
        except OSError as cleanup_error:
            if primary_error is None:
                raise
            primary_error.add_note(f'Temporary JSON cleanup also failed: {cleanup_error}')


def json_content_digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def git_output_bytes(repo: Path, *arguments: str) -> bytes:
    result = subprocess.run(
        [require_command('git'), '-C', str(repo), *arguments], check=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return result.stdout


def require_repository_file(repo: Path, relative_path: str) -> Path:
    """Require an existing, contained regular file addressed relative to the repo."""
    supplied_path = Path(relative_path)
    if supplied_path.is_absolute() or '..' in supplied_path.parts:
        raise SetupError(f'Expected contained relative path: {relative_path}')
    candidate_file = repo / supplied_path
    try:
        candidate_file.resolve().relative_to(repo.resolve())
    except ValueError as exc:
        raise SetupError(f'Path escapes repository: {relative_path}') from exc
    if candidate_file.is_symlink() or not candidate_file.is_file():
        raise SetupError(f'Expected regular file: {relative_path}')
    return candidate_file


def load_verification_controls(repo: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    """Load validated route policy and verification configuration together."""
    policy = load_json(repo / PIPELINE_POLICY_PATH)
    configuration = load_json(repo / VERIFICATION_CONFIG_PATH)
    validate_document(repo, 'pipeline-policy.schema.json', policy)
    validate_document(repo, 'verification-config.schema.json', configuration)
    for risk, route in policy['routes'].items():
        unknown_profiles = set(route['requiredProfiles']) - set(configuration['profiles'])
        if unknown_profiles:
            raise SetupError(f'{risk} refers to missing verification profiles: {sorted(unknown_profiles)}')
    return policy, configuration


def workspace_fingerprint(repo: Path, additional: list[str] | None = None) -> str:
    """Identify tracked/untracked state and explicitly declared ignored inputs.

    This is not a complete environment attestation. Runtime records and owned
    scratch are excluded; supported verification may not depend on either.
    """
    fingerprint_digest = hashlib.sha256()
    fingerprint_digest.update(git_output_bytes(repo, 'rev-parse', 'HEAD'))
    fingerprint_digest.update(git_output_bytes(
        repo, 'diff', '--binary', '--no-ext-diff', '--no-textconv', 'HEAD', '--',
    ))
    untracked_paths = git_output_bytes(repo, 'ls-files', '--others', '--exclude-standard', '-z')
    for encoded_path in sorted(filter(None, untracked_paths.split(b'\0'))):
        relative_path = os.fsdecode(encoded_path)
        if relative_path.startswith(('.sdlc/runtime/', '.sdlc/tmp/')):
            continue
        input_file = repo / relative_path
        fingerprint_digest.update(encoded_path + b'\0')
        if input_file.is_symlink():
            fingerprint_digest.update(b'link:' + os.fsencode(os.readlink(input_file)))
        elif input_file.is_file():
            fingerprint_digest.update(input_file.read_bytes())
        else:
            fingerprint_digest.update(b'<non-file>')
        fingerprint_digest.update(b'\0')
    for relative_path in sorted(set(additional or [])):
        if relative_path.startswith(('.sdlc/runtime/', '.sdlc/tmp/')):
            raise SetupError('Verification inputs must not depend on runtime records or task scratch.')
        input_file = require_repository_file(repo, relative_path)
        fingerprint_digest.update(relative_path.encode() + b'\0' + input_file.read_bytes() + b'\0')
    return fingerprint_digest.hexdigest()


def verification_input_identity(repo: Path, active: dict, policy: dict, configuration: dict) -> dict:
    """Describe the exact task and declared inputs associated with a verification run."""
    baseline_path = active.get('baseline')
    baseline_digest = (
        hashlib.sha256(require_repository_file(repo, baseline_path).read_bytes()).hexdigest()
        if baseline_path else None
    )
    return {
        'taskId': active['taskId'],
        'activeDigest': json_content_digest(active),
        'head': git_output_bytes(repo, 'rev-parse', 'HEAD').decode().strip(),
        'workspaceFingerprint': workspace_fingerprint(repo, configuration.get('additionalFingerprintInputs', [])),
        'policyDigest': json_content_digest(policy),
        'configurationDigest': json_content_digest(configuration),
        'policyFileDigest': hashlib.sha256((repo / PIPELINE_POLICY_PATH).read_bytes()).hexdigest(),
        'configurationFileDigest': hashlib.sha256((repo / VERIFICATION_CONFIG_PATH).read_bytes()).hexdigest(),
        'baselineDigest': baseline_digest,
    }


def required_verification_gaps(repo: Path) -> list[str]:
    """Report missing, failed or stale required local verification; do not approve."""
    active = load_json(repo / ACTIVE_TASK_PATH)
    if not isinstance(active, dict) or active.get('schemaVersion') != 2:
        return ['Old/malformed active state requires an explicit state decision.']
    if active.get('paused'):
        return ['Task remains paused/incomplete.']
    policy, configuration = load_verification_controls(repo)
    if (active.get('policyDigest') != json_content_digest(policy)
            or active.get('configurationDigest') != json_content_digest(configuration)):
        return ['Policy/configuration changed after routing; obtain reroute authority.']
    required_profiles = policy['routes'][active['riskClass']]['requiredProfiles']
    if active.get('requiredProfiles') != required_profiles:
        return ['Task profiles disagree with the current policy.']
    identity = verification_input_identity(repo, active, policy, configuration)
    gaps = []
    for profile in required_profiles:
        record_path = repo / RUNTIME_DIRECTORY / 'verification' / f'{profile}.json'
        if not record_path.is_file():
            gaps.append(f'Missing {profile} verification.')
            continue
        try:
            reject_redirected_path(record_path)
            verification_record = load_json(record_path)
            validate_verification_success(repo, verification_record, profile, identity,
                                          configuration['profiles'][profile])
            canonical = repo / verification_run_path(verification_record)
            reject_redirected_path(canonical)
            if load_json(canonical) != verification_record:
                raise SetupError('Current and canonical receipts disagree.')
        except (SetupError, OSError, ValueError, KeyError, TypeError) as exc:
            gaps.append(f'{profile} verification is incomplete, stale or invalid: {exc}')
    return gaps


def verification_run_path(record: dict) -> Path:
    """Return the canonical receipt path for an already schema-validated run."""
    return RUNTIME_DIRECTORY / 'runs' / record['taskId'] / (record['runId'] + '.json')


def verification_output_path(record: dict, ordinal: int) -> Path:
    """Return the create-only raw output path within a validated run's ownership."""
    return verification_run_path(record).with_suffix('') / 'commands' / f'{ordinal:04d}.output.bin'


def validate_verification_success(repo: Path, record: dict, profile: str,
                                  identity: dict, configured_commands: list[dict]) -> None:
    """Validate structure and consumer relationships without rehashing large logs.

    Raw hashes are produced at capture and checked by independent verification;
    routine gates check ownership and file size, not adversarial authenticity.
    """
    validate_document(repo, 'verification-run.schema.json', record)
    if record['passed'] is not True:
        raise SetupError('Attempt did not pass; run fresh verification.')
    if (record['taskId'] != identity['taskId'] or record['profile'] != profile
            or record['identityBefore'] != identity or record['identityAfter'] != identity):
        raise SetupError('Evidence is stale or belongs to different task/profile/inputs.')
    if (record['expectedCommandCount'] != len(configured_commands)
            or len(record['commands']) != len(configured_commands)):
        raise SetupError('Not every configured check executed.')
    for ordinal, (result, configured) in enumerate(zip(record['commands'], configured_commands), 1):
        if (result['ordinal'] != ordinal or result['name'] != configured['name']
                or result['argv'] != configured['argv']
                or result['timeoutSeconds'] != configured.get('timeoutSeconds', 600)
                or not result['resolvedExecutable'] or not result['finishedAt']):
            raise SetupError('Executed command inventory differs from configured checks.')
        capture = result['capture']
        expected = verification_output_path(record, ordinal).as_posix()
        if capture['path'] != expected:
            raise SetupError('Raw capture is outside this command attempt.')
        raw = repo / expected
        reject_redirected_path(raw)
        require_repository_file(repo, expected)
        if raw.stat().st_size != capture['byteLength']:
            raise SetupError('Raw capture size differs from recorded evidence.')
