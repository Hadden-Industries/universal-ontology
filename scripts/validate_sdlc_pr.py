#!/usr/bin/env python3
"""Validate PR metadata against exact Issue/baseline content using trusted-base code.

This checks linkage and document integrity, not semantic naming, human approval,
runtime tests, security findings, or mathematical global optimality.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
from pathlib import Path
from _commands import SetupError
from _sdlc_state import validate_document
from _sdlc_baseline import (BaselineBlob, ISSUE_BASELINE_PATH, OBJECT_ID,
    MAX_BASELINE_BYTES, METADATA_TIMEOUT_SECONDS, require_baseline_path,
    is_canonical_plan_path, require_plan_text, require_acceptance_reference,
    decode_baseline_text)
FIELDS = {'issue': '^Change issue:[ \\t]*(#[1-9][0-9]*|none)[ \\t]*$', 'baseline': '^Accepted baseline:[ \\t]*(\\S+)[ \\t]*$', 'risk': '^Risk class:[ \\t]*(R[0-3])[ \\t]*$', 'acceptance': '^Acceptance IDs implemented:[ \\t]*([^\\r\\n]*)$', 'baseline_only': '^Baseline-only:[ \\t]*(yes|no)[ \\t]*$'}
FIELDS.update({
    'new_functionality': r'^New functionality:[ \t]*(yes|no)[ \t]*$',
    'software_selection': r'^Software selection:[ \t]*([^\r\n]+)$',
})
MAX_GITHUB_JSON_BYTES = 8 * 1024 * 1024
REPOSITORY_NAME = re.compile(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+')


def require_repository_identity(repository: str) -> str:
    if (not isinstance(repository, str) or not REPOSITORY_NAME.fullmatch(repository)
            or any(part in {'.', '..'} for part in repository.split('/'))):
        raise SetupError('Invalid repository identity.')
    return repository


def pull_request_identity(pull_request: dict, repository: str) -> tuple:
    """Bind both authoritative repositories, refs and immutable revisions."""
    identities = []
    for side in ('base', 'head'):
        value = pull_request[side]
        name = require_repository_identity(value['repo']['full_name'])
        if side == 'base' and name != repository:
            raise SetupError('PR base repository differs from the event repository.')
        if not isinstance(value['sha'], str) or not OBJECT_ID.fullmatch(value['sha']):
            raise SetupError('PR revision is not a full native commit identity.')
        identities.append((name, value['sha'], value['ref']))
    return tuple(identities)

def parse_pull_request_fields(body: str) -> dict[str, str]:
    """Parse the repository-owned PR metadata contract, accepting native editor line endings."""
    body = '\n'.join(body.splitlines())
    values = {}
    for key, pattern in FIELDS.items():
        matches = list(re.finditer(pattern, body, flags=re.MULTILINE | re.IGNORECASE))
        if len(matches) != 1:
            raise SetupError(f'Expected exactly one valid PR field: {key}.')
        values[key] = matches[0].group(1).strip()
    if is_canonical_plan_path(values['baseline']):
        matches = re.findall(r'^Baseline acceptance:[ \t]*([^\r\n]*)$', body, re.MULTILINE | re.IGNORECASE)
        if len(matches) != 1:
            raise SetupError('Expected exactly one Baseline acceptance field.')
        require_acceptance_reference(matches[0])
        values['baseline_acceptance'] = matches[0]
    return values

def validate_pull_request_linkage(repo_root: Path, fields: dict[str, str], repository: str, issue: dict | None, paths: list[str], baseline: BaselineBlob | None, prior_baseline: BaselineBlob | None, any_existing_baseline_changed: bool=False, *, head_repository: str | None = None) -> list[str]:
    """Check metadata and baseline integrity. Human acceptance, semantic naming and program correctness remain separate reviews."""
    errors = []
    if fields['new_functionality'].lower() == 'yes' and fields['software_selection'].strip().lower() in {'', 'none', 'n/a', '-', 'pending'}:
        errors.append('REU-01: new functionality requires completed software-selection research, including latest/LTS and licence restrictions.')
    risk = fields['risk'].upper()
    baseline_only = fields['baseline_only'].lower() == 'yes'
    issue_number = int(fields['issue'][1:]) if fields['issue'].startswith('#') else None
    required = risk in {'R2', 'R3'}
    plan_route = is_canonical_plan_path(fields['baseline'])
    if required and issue is None and not plan_route:
        errors.append(f'{risk} requires an accepted Issue/baseline.')
    if issue_number is not None and issue is None:
        errors.append('Referenced Issue could not be read.')
    if issue is not None:
        labels = {x['name'] for x in issue.get('labels', [])}
        risks = sorted((x for x in labels if re.fullmatch('risk:R[0-3]', x)))
        if risks != [f'risk:{risk}']:
            errors.append('Issue must have exactly the matching risk label.')
        if 'state:changed' in labels:
            errors.append('Normative Issue changed; reaccept before proceeding.')
        if baseline_only:
            if 'state:ready-to-baseline' not in labels:
                errors.append('Baseline PR requires state:ready-to-baseline.')
        elif required and (not labels.intersection({'state:accepted', 'state:implementing', 'state:verified'})):
            errors.append('Elevated-risk implementation requires accepted/implementing/verified state.')
    if any_existing_baseline_changed:
        errors.append('Previously recorded baselines are immutable; use a new version.')
    if baseline is not None and (not isinstance(baseline, BaselineBlob)
            or baseline.path != fields['baseline']
            or baseline.repository != (head_repository or repository)):
        return errors + ['Baseline object does not match the authoritative candidate repository/path.']
    if prior_baseline is not None and (not isinstance(prior_baseline, BaselineBlob)
            or prior_baseline.path != fields['baseline'] or prior_baseline.repository != repository):
        return errors + ['Prior baseline object does not match the authoritative base repository/path.']
    if plan_route:
        if baseline_only:
            errors.append('Baseline-only capture is restricted to actual Issue snapshots.')
        if baseline is None or prior_baseline is None or not baseline.same_entry(prior_baseline):
            errors.append('Plan baseline must already exist unchanged as the same regular entry in the base revision.')
        if fields['baseline'] in paths:
            errors.append('Selected plan baseline cannot be added, changed, deleted or renamed in its implementation PR.')
        if required and any(p.startswith('docs/sdlc/baselines/') for p in paths):
            errors.append('R2/R3 implementation cannot modify Issue baselines in the same PR.')
        try:
            require_acceptance_reference(fields.get('baseline_acceptance'))
            references = json.loads(fields['acceptance'])
            if (not isinstance(references, list) or not references
                    or any(not isinstance(line, str) or not line.strip() for line in references)
                    or len(set(references)) != len(references)):
                raise SetupError('Plan acceptance references must be distinct nonblank source lines in a nonempty JSON array.')
            if baseline is not None:
                lines = require_plan_text(decode_baseline_text(baseline.raw)).splitlines()
                if any(lines.count(line) != 1 for line in references):
                    raise SetupError('Each plan acceptance reference must occur exactly once as an exact source line.')
        except (SetupError, ValueError) as exc:
            errors.append(str(exc) if isinstance(exc, SetupError) else 'Plan acceptance references are not valid JSON.')
        return errors
    document = None
    if baseline is not None:
        try:
            document = json.loads(decode_baseline_text(baseline.raw))
            validate_document(repo_root, 'accepted-baseline.schema.json', document)
        except (SetupError, ValueError) as exc:
            errors.append(f'Invalid baseline schema: {exc}')
            return errors
        path_match = ISSUE_BASELINE_PATH.fullmatch(fields['baseline'])
        if not path_match or (int(path_match[1]), int(path_match[2])) != (document['issue']['number'], document['version']):
            errors.append('Baseline path does not identify the recorded Issue/version.')
        baseline_issue = document['issue']
        if document.get('repository') != repository:
            errors.append('Baseline repository mismatch.')
        if baseline_issue.get('number') != issue_number:
            errors.append('Baseline Issue mismatch.')
        stored = hashlib.sha256((baseline_issue.get('body') or '').encode()).hexdigest()
        if baseline_issue.get('bodySha256') != stored:
            errors.append('Baseline stored content/hash mismatch.')
        if issue is not None:
            live = hashlib.sha256((issue.get('body') or '').encode()).hexdigest()
            if stored != live or baseline_issue.get('title') != issue.get('title'):
                errors.append('Current Issue title/body differs from the baseline.')
    elif fields['baseline'].lower() not in {'none', 'n/a', '-'}:
        errors.append('Specified baseline was not retrieved.')
    if baseline_only:
        if issue_number is None or baseline is None:
            errors.append('Baseline-only PR requires Issue and snapshot.')
        if not paths or any((not p.startswith(f'docs/sdlc/baselines/issue-{issue_number}/') for p in paths)):
            errors.append('Baseline-only PR may change only its Issue baseline directory.')
    elif required:
        if baseline is None or prior_baseline is None or not baseline.same_entry(prior_baseline):
            errors.append('R2/R3 baseline must already exist unchanged in the base revision.')
        if any((p.startswith('docs/sdlc/baselines/') for p in paths)):
            errors.append('R2/R3 implementation cannot modify baselines in the same PR.')
        ids = re.findall('\\bAC-\\d{3,}\\b', fields['acceptance'])
        if not ids:
            errors.append('R2/R3 requires acceptance IDs.')
        elif document is not None:
            for criterion in ids:
                if criterion not in document['issue']['body']:
                    errors.append(f'{criterion} absent from baseline.')
    return errors

def gh_api(path: str) -> object:
    """Read bounded strict UTF-8 JSON through the existing read-only native CLI."""
    if not os.environ.get('GH_TOKEN'):
        raise SetupError('GH_TOKEN is required for metadata reads.')
    if not re.fullmatch(r'repos/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/[A-Za-z0-9_/?=&.%+-]+', path):
        raise SetupError('Invalid native metadata endpoint.')
    timed_out = threading.Event()
    with subprocess.Popen(['gh', 'api', '--method', 'GET', path], stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL) as process:
        def expire():
            timed_out.set()
            process.kill()
        timer = threading.Timer(METADATA_TIMEOUT_SECONDS, expire)
        timer.daemon = True
        timer.start()
        try:
            raw = process.stdout.read(MAX_GITHUB_JSON_BYTES + 1)
            if len(raw) > MAX_GITHUB_JSON_BYTES:
                process.kill()
                raise SetupError('GitHub metadata exceeds the 8 MiB response limit.')
            code = process.wait()
            if timed_out.is_set():
                raise SetupError('Native GitHub metadata read timed out.')
            if code:
                raise SetupError('Native GitHub metadata unavailable (access, rate limit or transport failure); absence is not established.')
        finally:
            timer.cancel()
            if process.poll() is None:
                process.kill()
            process.wait()
    try:
        def unique_object(pairs):
            value = {}
            for key, item in pairs:
                if key in value:
                    raise SetupError('Native GitHub JSON has duplicate object members.')
                value[key] = item
            return value
        def reject_nonfinite(_value):
            raise SetupError('Native GitHub JSON contains a non-finite number.')
        return json.loads(raw.decode('utf-8', errors='strict'),
                          object_pairs_hook=unique_object, parse_constant=reject_nonfinite)
    except (UnicodeError, ValueError) as exc:
        raise SetupError('Native GitHub metadata is not complete strict UTF-8 JSON.') from exc

def fetch_baseline_at_revision(repository: str, path: str, ref: str) -> BaselineBlob:
    """Walk pinned native commit/tree/blob objects; candidate content stays data."""
    require_baseline_path(path)
    require_repository_identity(repository)
    if not OBJECT_ID.fullmatch(ref):
        raise SetupError('Invalid native baseline repository or full commit identity.')
    prefix = f'repos/{repository}/git'
    commit = gh_api(f'{prefix}/commits/{ref}')
    if not isinstance(commit, dict) or commit.get('sha') != ref or not isinstance(commit.get('tree'), dict):
        raise SetupError('Native baseline commit identity mismatch.')
    tree_id = commit['tree'].get('sha')
    components = path.split('/')
    for ordinal, component in enumerate(components):
        if not isinstance(tree_id, str) or not OBJECT_ID.fullmatch(tree_id):
            raise SetupError('Invalid native tree object identity.')
        tree = gh_api(f'{prefix}/trees/{tree_id}')
        if (not isinstance(tree, dict) or tree.get('sha') != tree_id
                or tree.get('truncated') is not False or not isinstance(tree.get('tree'), list)):
            raise SetupError('Native baseline tree evidence is incomplete or mismatched.')
        if any(not isinstance(entry, dict) or not isinstance(entry.get('path'), str) for entry in tree['tree']):
            raise SetupError('Malformed native baseline tree entries.')
        matches = [entry for entry in tree['tree'] if entry['path'] == component]
        if not matches:
            raise SetupError('Baseline path is absent from the complete native tree.')
        if len(matches) != 1:
            raise SetupError('Ambiguous baseline path in native tree.')
        entry = matches[0]
        if ordinal < len(components) - 1:
            if entry.get('mode') != '040000' or entry.get('type') != 'tree':
                raise SetupError('Baseline parent is not an ordinary native tree.')
            tree_id = entry.get('sha')
    if entry.get('mode') not in {'100644', '100755'} or entry.get('type') != 'blob':
        raise SetupError('Baseline leaf is not a regular-file native blob.')
    blob_id = entry.get('sha')
    if not isinstance(blob_id, str) or not OBJECT_ID.fullmatch(blob_id):
        raise SetupError('Invalid native blob identity.')
    blob = gh_api(f'{prefix}/blobs/{blob_id}')
    if (not isinstance(blob, dict) or blob.get('sha') != blob_id or blob.get('encoding') != 'base64'
            or type(blob.get('size')) is not int or not 0 <= blob['size'] <= MAX_BASELINE_BYTES
            or not isinstance(blob.get('content'), str)):
        raise SetupError('Invalid native baseline blob transport or exceeded 1 MiB limit.')
    try:
        encoded = blob['content'].replace('\n', '').replace('\r', '')
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, UnicodeError) as exc:
        raise SetupError('Invalid native baseline base64 encoding.') from exc
    if len(raw) != blob['size']:
        raise SetupError('Native baseline blob size mismatch.')
    decode_baseline_text(raw)
    return BaselineBlob(repository, ref, path, entry['mode'], blob_id, raw)

def main() -> int:
    """Validate a complete changed-file listing and detect movement during reads. This is not an atomic merge-time transaction."""
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8'))
    repository = require_repository_identity(os.environ['GITHUB_REPOSITORY'])
    number = event['pull_request']['number']
    if type(number) is not int or number <= 0:
        raise SetupError('Invalid PR number.')
    pull_request = gh_api(f'repos/{repository}/pulls/{number}')
    target = pull_request_identity(pull_request, repository)
    if target != pull_request_identity(event['pull_request'], repository):
        raise SetupError('PR changed since this run was queued; rerun against current head and base.')
    fields = parse_pull_request_fields(pull_request.get('body') or '')
    issue_number = int(fields['issue'][1:]) if fields['issue'].startswith('#') else None
    issue = gh_api(f'repos/{repository}/issues/{issue_number}') if issue_number else None
    changes = []
    for page in range(1, 32):
        part = gh_api(f'repos/{repository}/pulls/{number}/files?per_page=100&page={page}')
        if not isinstance(part, list):
            raise SetupError('Unexpected changed-files response.')
        changes.extend(part)
        if len(part) < 100:
            break
    if type(pull_request['changed_files']) is not int or len(changes) != pull_request['changed_files']:
        raise SetupError('Changed-file listing incomplete (including GitHub API limits); use a separately reviewed complete check.')
    paths = []
    seen = set()
    for change in changes:
        if (not isinstance(change, dict) or not isinstance(change.get('filename'), str)
                or not change['filename'] or change['filename'] in seen
                or change.get('status') not in {'added', 'modified', 'removed', 'renamed', 'copied', 'changed', 'unchanged'}):
            raise SetupError('Malformed or duplicate changed-file entry.')
        seen.add(change['filename'])
        paths.append(change['filename'])
        if change.get('status') == 'renamed' and not change.get('previous_filename'):
            raise SetupError('Renamed file lacks its original path.')
        if 'previous_filename' in change:
            if not isinstance(change['previous_filename'], str) or not change['previous_filename']:
                raise SetupError('Invalid original changed-file path.')
            paths.append(change['previous_filename'])
    existing_change = any(
        (x['filename'].startswith('docs/sdlc/baselines/') and x['status'] != 'added')
        or x.get('previous_filename', '').startswith('docs/sdlc/baselines/')
        for x in changes)
    baseline = prior = None
    baseline_path = fields['baseline']
    if baseline_path.lower() not in {'none', 'n/a', '-'}:
        baseline = fetch_baseline_at_revision(target[1][0], baseline_path, target[1][1])
        if is_canonical_plan_path(baseline_path) or baseline_path not in paths or any((x['filename'] == baseline_path and x['status'] != 'added' for x in changes)):
            prior = fetch_baseline_at_revision(target[0][0], baseline_path, target[0][1])
    root = Path(__file__).resolve().parent.parent
    errors = validate_pull_request_linkage(root, fields, repository, issue, paths, baseline, prior, existing_change, head_repository=target[1][0])
    current_pull_request = gh_api(f'repos/{repository}/pulls/{number}')
    if pull_request_identity(current_pull_request, repository) != target or current_pull_request.get('body') != pull_request.get('body'):
        errors.append('PR changed during validation; rerun.')
    if issue_number:
        current_issue = gh_api(f'repos/{repository}/issues/{issue_number}')
        if current_issue.get('updated_at') != issue.get('updated_at'):
            errors.append('Issue changed during validation; rerun.')
    if errors:
        raise SetupError('; '.join(errors))
    print('Metadata/baseline linkage valid. Naming, intent, approvals and security require the documented reviews.')
    return 0
if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (SetupError, ValueError, OSError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'SDLC PR linkage failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
