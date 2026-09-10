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
from _sdlc_baseline import (BaselineBlob, MAX_BASELINE_BYTES, METADATA_TIMEOUT_SECONDS,
                            OBJECT_ID, require_baseline_path, require_plan_text,
                            decode_baseline_text)

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


def active_task_conflict(path: Path) -> SetupError:
    """Describe observed ownership after a collision without retrying acquisition."""
    try:
        reject_redirected_path(path)
        existing = load_json(path)
        if (not isinstance(existing, dict) or existing.get('schemaVersion') != 2
                or not all(isinstance(existing.get(key), str) and existing[key]
                           for key in ('task', 'taskId', 'riskClass'))):
            raise ValueError('Unsupported ownership record')
        # These are observed identity fields, not validation or approval of the task.
        identity = ', '.join(f'{key}={json.dumps(existing[key][:256], ensure_ascii=True)}'
                             for key in ('task', 'taskId', 'riskClass'))
        baseline = json.dumps(str(existing.get('baseline'))[:256], ensure_ascii=True)
        return SetupError(f'An active record already exists at {path}: {identity}, '
                          f'baseline={baseline}, paused={existing.get("paused") is True}. '
                          'Inspect status; independent work requires a separate worktree. No ownership changed.')
    except (SetupError, OSError, ValueError) as exc:
        return SetupError(f'Existing active state at {path} could not be identified '
                          f'({type(exc).__name__}); it may be malformed, unsupported or changed during inspection. '
                          'Preserve the state and obtain an explicit state decision; this start will not retry.')


def create_active_task_exclusively(repo: Path, active: dict[str, Any]) -> None:
    """Publish complete initial ownership once; retain evidence of interrupted starts."""
    path = repo / ACTIVE_TASK_PATH
    encoded = (json.dumps(active, indent=2, sort_keys=True) + '\n').encode('utf-8')
    reject_redirected_path(path)
    if os.path.lexists(path):
        raise active_task_conflict(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, candidate = tempfile.mkstemp(prefix=f'.active-{active["taskId"]}-', dir=path.parent)
    try:
        stream = os.fdopen(descriptor, 'wb')
    except BaseException:
        os.close(descriptor)
        raise
    try:
        try:
            stream.write(encoded)
            stream.flush()
        except BaseException as primary_error:
            try:
                stream.close()
            except (OSError, ValueError) as close_error:
                primary_error.add_note(f'Closing preparation also failed: {close_error}')
            raise
        else:
            stream.close()
    except (OSError, ValueError) as exc:
        details = '; '.join([str(exc), *getattr(exc, '__notes__', [])])
        raise SetupError(f'Initial task preparation failed: {details}. '
                         f'Preparation retained at {candidate}; no active record was published.') from exc
    try:
        reject_redirected_path(path)
        reject_redirected_path(Path(candidate))
        os.link(candidate, path)
    except FileExistsError as exc:
        conflict = active_task_conflict(path)
        try:
            os.unlink(candidate)
        except OSError as cleanup_error:
            conflict = SetupError(f'{conflict} Private preparation retained at {candidate}; '
                                  f'cleanup failed ({type(cleanup_error).__name__}).')
        raise conflict from exc
    except (OSError, ValueError, SetupError) as exc:
        raise SetupError(f'Initial task publication did not complete: {exc}. '
                         f'Preparation retained at {candidate}; inspect {path} before retrying.') from exc
    # The active name now owns the complete record. Cleanup never rolls it back.
    try:
        os.unlink(candidate)
    except OSError as exc:
        raise SetupError(f'Task {active["taskId"]} was established at {path}, but private-name '
                         f'cleanup failed ({type(exc).__name__}); alias retained at {candidate}. '
                         'Do not edit the alias. Inspect status; do not start again.') from exc


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


def read_local_baseline_bytes(repo: Path, path: str) -> bytes:
    """Read a bounded baseline without following local parent redirects."""
    require_baseline_path(path)
    reject_redirected_path(repo / path)
    candidate = require_repository_file(repo, path)
    with candidate.open('rb') as stream:
        raw = stream.read(MAX_BASELINE_BYTES + 1)
    decode_baseline_text(raw)
    return raw


def read_local_baseline_at_revision(repo: Path, path: str, revision: str = 'HEAD') -> BaselineBlob:
    """Resolve a literal regular Git entry; never checkout or text-convert it."""
    require_baseline_path(path)
    def git(*args):
        try:
            result = subprocess.run([require_command('git'), '--no-optional-locks', '-C', str(repo), *args],
                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                timeout=METADATA_TIMEOUT_SECONDS)
            return result.stdout
        except (subprocess.SubprocessError, OSError) as exc:
            raise SetupError('Native local baseline metadata is unavailable.') from exc
    commit = git('rev-parse', '--verify', '--end-of-options', revision + '^{commit}').decode('ascii').strip()
    if not OBJECT_ID.fullmatch(commit):
        raise SetupError('Native Git did not resolve a full baseline commit.')
    rows = git('ls-tree', '-z', '--full-tree', commit, '--', ':(literal)' + path).split(b'\0')
    if len(rows) != 2 or rows[-1] != b'' or b'\t' not in rows[0]:
        raise SetupError('Baseline regular entry is absent or ambiguous in the committed tree.')
    metadata, selected_path = rows[0].split(b'\t', 1)
    fields = metadata.decode('ascii').split()
    if (len(fields) != 3 or fields[0] not in {'100644', '100755'} or fields[1] != 'blob'
            or not OBJECT_ID.fullmatch(fields[2]) or selected_path.decode('utf-8') != path):
        raise SetupError('Baseline is not the exact regular-file Git entry.')
    size = git('cat-file', '-s', fields[2]).strip()
    if not size.isdigit() or int(size) > MAX_BASELINE_BYTES:
        raise SetupError('Baseline exceeds the 1 MiB byte limit or has invalid native size.')
    raw = git('cat-file', 'blob', fields[2])
    if len(raw) != int(size):
        raise SetupError('Native baseline blob size mismatch.')
    return BaselineBlob(repo.resolve().as_posix(), commit, path, fields[0], fields[2], raw)


def require_local_baseline(repo: Path, path: str, *, committed: bool) -> bytes:
    raw = read_local_baseline_bytes(repo, path)
    text = decode_baseline_text(raw)
    if require_baseline_path(path) == 'plan':
        require_plan_text(text)
    else:
        try:
            document = json.loads(text)
        except ValueError as exc:
            raise SetupError('Issue baseline is not valid JSON.') from exc
        validate_document(repo, 'accepted-baseline.schema.json', document)
    if committed and read_local_baseline_at_revision(repo, path).raw != raw:
        raise SetupError('Prior baseline differs from the committed native blob.')
    return raw


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
        hashlib.sha256(read_local_baseline_bytes(repo, baseline_path)).hexdigest()
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
