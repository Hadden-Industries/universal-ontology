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
from pathlib import Path
from _commands import SetupError
from _sdlc_state import validate_document
FIELDS = {'issue': '^Change issue:[ \\t]*(#[1-9][0-9]*|none)[ \\t]*$', 'baseline': '^Accepted baseline:[ \\t]*(\\S+)[ \\t]*$', 'risk': '^Risk class:[ \\t]*(R[0-3])[ \\t]*$', 'acceptance': '^Acceptance IDs implemented:[ \\t]*([^\\r\\n]*)$', 'baseline_only': '^Baseline-only:[ \\t]*(yes|no)[ \\t]*$'}
FIELDS.update({
    'new_functionality': r'^New functionality:[ \t]*(yes|no)[ \t]*$',
    'software_selection': r'^Software selection:[ \t]*([^\r\n]+)$',
})
BASELINE_PATH = re.compile('^docs/sdlc/baselines/issue-([1-9][0-9]*)/v([1-9][0-9]*)\\.json$')

def parse_pull_request_fields(body: str) -> dict[str, str]:
    """Parse the repository-owned PR metadata contract, accepting native editor line endings."""
    body = '\n'.join(body.splitlines())
    values = {}
    for key, pattern in FIELDS.items():
        matches = list(re.finditer(pattern, body, flags=re.MULTILINE | re.IGNORECASE))
        if len(matches) != 1:
            raise SetupError(f'Expected exactly one valid PR field: {key}.')
        values[key] = matches[0].group(1).strip()
    return values

def validate_pull_request_linkage(repo_root: Path, fields: dict[str, str], repository: str, issue: dict | None, paths: list[str], baseline: dict | None, prior_baseline: dict | None, any_existing_baseline_changed: bool=False) -> list[str]:
    """Check metadata and baseline integrity. Human acceptance, semantic naming and program correctness remain separate reviews."""
    errors = []
    if fields['new_functionality'].lower() == 'yes' and fields['software_selection'].strip().lower() in {'', 'none', 'n/a', '-', 'pending'}:
        errors.append('REU-01: new functionality requires completed software-selection research, including latest/LTS and licence restrictions.')
    risk = fields['risk'].upper()
    baseline_only = fields['baseline_only'].lower() == 'yes'
    issue_number = int(fields['issue'][1:]) if fields['issue'].startswith('#') else None
    required = risk in {'R2', 'R3'}
    if required and issue is None:
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
    if baseline is not None:
        try:
            validate_document(repo_root, 'accepted-baseline.schema.json', baseline)
        except SetupError as exc:
            errors.append(f'Invalid baseline schema: {exc}')
            return errors
        path_match = BASELINE_PATH.fullmatch(fields['baseline'])
        if not path_match or (int(path_match[1]), int(path_match[2])) != (baseline['issue']['number'], baseline['version']):
            errors.append('Baseline path does not identify the recorded Issue/version.')
        baseline_issue = baseline.get('issue', {})
        if baseline.get('repository') != repository:
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
        if baseline is None or prior_baseline != baseline:
            errors.append('R2/R3 baseline must already exist unchanged in the base revision.')
        if any((p.startswith('docs/sdlc/baselines/') for p in paths)):
            errors.append('R2/R3 implementation cannot modify baselines in the same PR.')
        ids = re.findall('\\bAC-\\d{3,}\\b', fields['acceptance'])
        if not ids:
            errors.append('R2/R3 requires acceptance IDs.')
        elif baseline is not None:
            for criterion in ids:
                if criterion not in baseline['issue']['body']:
                    errors.append(f'{criterion} absent from baseline.')
    return errors

def gh_api(path: str) -> object:
    """Read GitHub API JSON using the supplied read-scoped token and native CLI."""
    if not os.environ.get('GH_TOKEN'):
        raise SetupError('GH_TOKEN is required for metadata reads.')
    result = subprocess.run(['gh', 'api', path], check=True, text=True, stdout=subprocess.PIPE)
    return json.loads(result.stdout)

def fetch_baseline_at_revision(repository: str, path: str, ref: str) -> dict:
    """Read a contained baseline blob at a specific revision without executing candidate code."""
    if not BASELINE_PATH.fullmatch(path):
        raise SetupError('Invalid baseline path.')
    from urllib.parse import quote
    value = gh_api(f"repos/{repository}/contents/{quote(path, safe='/')}?ref={quote(ref, safe='')}")
    if not isinstance(value, dict) or value.get('type') != 'file' or value.get('encoding') != 'base64':
        raise SetupError('Expected a regular base64-encoded GitHub content file.')
    return json.loads(base64.b64decode(value['content']).decode('utf-8'))

def main() -> int:
    """Validate a complete changed-file listing and detect movement during reads. This is not an atomic merge-time transaction."""
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    repository = os.environ['GITHUB_REPOSITORY']
    number = event['pull_request']['number']
    if not re.fullmatch('[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise SetupError('Invalid repository identity.')
    pull_request = gh_api(f'repos/{repository}/pulls/{number}')
    if any(pull_request[side]['sha'] != event['pull_request'][side]['sha'] for side in ('head', 'base')):
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
    if len(changes) != pull_request['changed_files']:
        raise SetupError('Changed-file listing incomplete (including GitHub API limits); use a separately reviewed complete check.')
    paths = [x['filename'] for x in changes]
    existing_change = any(
        (x['filename'].startswith('docs/sdlc/baselines/') and x['status'] != 'added')
        or x.get('previous_filename', '').startswith('docs/sdlc/baselines/')
        for x in changes)
    baseline = prior = None
    baseline_path = fields['baseline']
    if baseline_path.lower() not in {'none', 'n/a', '-'}:
        baseline = fetch_baseline_at_revision(repository, baseline_path, pull_request['head']['sha'])
        if baseline_path not in paths or any((x['filename'] == baseline_path and x['status'] != 'added' for x in changes)):
            prior = fetch_baseline_at_revision(repository, baseline_path, pull_request['base']['sha'])
    root = Path(__file__).resolve().parent.parent
    errors = validate_pull_request_linkage(root, fields, repository, issue, paths, baseline, prior, existing_change)
    current_pull_request = gh_api(f'repos/{repository}/pulls/{number}')
    if any(current_pull_request[side]['sha'] != pull_request[side]['sha'] for side in ('head', 'base')) or current_pull_request.get('body') != pull_request.get('body'):
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
