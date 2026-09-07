#!/usr/bin/env python3
"""Capture exact Issue snapshots and manage risk-routed local verification evidence.

This is a local development aid, not an authorisation server or tamper-proof ledger.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path
from _commands import SetupError, require_command, run
from _repository import derive_repo_from_script
from _sdlc_state import ACTIVE_TASK_PATH, RUNTIME_DIRECTORY, json_content_digest, required_verification_gaps, git_output_bytes, load_verification_controls, load_json, require_repository_file, write_json_atomically, verification_input_identity, validate_document

def utc_now() -> str:
    """Return an explicit UTC timestamp for an actual local event."""
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')

def capture_issue_baseline(repo: Path, args: argparse.Namespace) -> None:
    """Capture exact Issue content; supplied acceptance metadata is not authenticated approval. Never overwrite a baseline version."""
    github_cli = require_command('gh')
    issue = json.loads(run([github_cli, 'issue', 'view', str(args.issue), '--json', 'number,title,url,author,createdAt,updatedAt,labels,body'], cwd=repo, capture=True).stdout)
    repository = json.loads(run([github_cli, 'repo', 'view', '--json', 'nameWithOwner'], cwd=repo, capture=True).stdout)['nameWithOwner']
    issue_body = issue.get('body') or ''
    baseline_record = {'schemaVersion': 1, 'repository': repository, 'capturedAt': utc_now(), 'acceptedAt': args.accepted_at, 'acceptedBy': args.accepted_by, 'version': args.version, 'issue': {'number': issue['number'], 'title': issue['title'], 'url': issue['url'], 'author': (issue.get('author') or {}).get('login'), 'createdAt': issue.get('createdAt'), 'updatedAt': issue.get('updatedAt'), 'labels': sorted((x['name'] for x in issue['labels'])), 'body': issue_body, 'bodySha256': hashlib.sha256(issue_body.encode()).hexdigest()}}
    validate_document(repo, 'accepted-baseline.schema.json', baseline_record)
    baseline_directory = repo / 'docs/sdlc/baselines' / f'issue-{args.issue}'
    baseline_json_path, baseline_markdown_path = (baseline_directory / f'v{args.version}.json', baseline_directory / f'v{args.version}.md')
    if baseline_json_path.exists() or baseline_markdown_path.exists():
        raise SetupError('Snapshot already exists. Create a new version; overwriting accepted history is not supported.')
    write_json_atomically(baseline_json_path, baseline_record)
    baseline_markdown_path.write_text(f"# Issue #{args.issue}, snapshot v{args.version}\n\nAcceptance decision reference: {args.approval_reference}\n\nReported accepted-by: {args.accepted_by}; reported accepted-at: {args.accepted_at}.\nThese supplied values require independent confirmation; capture does not approve.\n\nBody SHA-256: `{baseline_record['issue']['bodySha256']}`\n\n{issue_body}\n", encoding='utf-8')
    print(baseline_json_path.relative_to(repo))
    print(baseline_markdown_path.relative_to(repo))

def begin_task(repo: Path, args: argparse.Namespace) -> None:
    """Start one local task after loading its required verification route; preserve any existing active task."""
    if (repo / ACTIVE_TASK_PATH).exists():
        raise SetupError('An active record already exists. Use authorised handoff or pause; do not overwrite it.')
    if args.new_functionality and (
        not args.software_selection_reference
        or args.software_selection_reference.strip().lower() in {'', 'none', 'n/a', '-', 'pending'}
    ):
        raise SetupError('REU-01: new functionality requires completed software-selection research before implementation.')
    policy, config = load_verification_controls(repo)
    route = policy['routes'][args.risk]
    if route['priorBaselineRequired'] and (not args.baseline):
        raise SetupError(f'{args.risk} requires a previously approved baseline.')
    if args.baseline:
        baseline_file = require_repository_file(repo, args.baseline)
        validate_document(repo, 'accepted-baseline.schema.json', load_json(baseline_file))
        if route['priorBaselineRequired']:
            committed_baseline = git_output_bytes(repo, 'show', f'HEAD:{args.baseline}')
            if committed_baseline != baseline_file.read_bytes():
                raise SetupError('Prior baseline is absent from HEAD or differs from it.')
    active_task = {'schemaVersion': 2, 'taskId': uuid.uuid4().hex, 'task': args.task, 'riskClass': args.risk, 'baseline': args.baseline, 'intentReference': args.intent_reference, 'purpose': args.purpose, 'newFunctionality': args.new_functionality, 'softwareSelectionReference': args.software_selection_reference, 'startedAt': utc_now(), 'startingHead': git_output_bytes(repo, 'rev-parse', 'HEAD').decode().strip(), 'requiredProfiles': route['requiredProfiles'], 'policyDigest': json_content_digest(policy), 'configurationDigest': json_content_digest(config)}
    write_json_atomically(repo / ACTIVE_TASK_PATH, active_task)
    print(f"Active {args.task}: {args.risk}; required profiles={route['requiredProfiles']}")

def verify_task(repo: Path, args: argparse.Namespace) -> None:
    """Execute selected commands and retain each attempt, including failures. Compare task/input identities before and after; never infer test semantics from exit zero alone."""
    active_task = load_json(repo / ACTIVE_TASK_PATH)
    if active_task.get('schemaVersion') != 2:
        raise SetupError('Unsupported active-state schema; preserve evidence and obtain an explicit state decision.')
    if active_task.get('paused'):
        raise SetupError('Task is paused; inspect the handoff and use an authorised resume decision.')
    policy, config = load_verification_controls(repo)
    if active_task.get('policyDigest') != json_content_digest(policy) or active_task.get('configurationDigest') != json_content_digest(config):
        raise SetupError('Controls changed after routing. Re-route explicitly; do not silently change the required evidence.')
    profiles = [args.profile] if args.profile else active_task['requiredProfiles']
    if any((profile_name not in config['profiles'] for profile_name in profiles)):
        raise SetupError('Unknown profile; configure real supported commands before use.')
    failed = False
    for profile in profiles:
        inputs_before = verification_input_identity(repo, active_task, policy, config)
        command_results = []
        for command in config['profiles'][profile]:
            argv = command['argv']
            print(f"== {command['name']}: {subprocess.list2cmdline(argv)} ==")
            started_at = utc_now()
            try:
                executable = require_command(argv[0])
                completed = subprocess.run([executable, *argv[1:]], cwd=repo, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=command.get('timeoutSeconds', 600), check=False)
                output = completed.stdout or ''
                return_code = completed.returncode
                status = 'passed' if return_code == 0 else 'failed'
            except subprocess.TimeoutExpired as exc:
                partial_output = exc.stdout or ''
                output = partial_output.decode(errors='replace') if isinstance(partial_output, bytes) else partial_output
                return_code = None
                status = 'timeout'
            except (OSError, SetupError) as exc:
                output = str(exc)
                return_code = None
                status = 'unavailable'
            print(output, end='' if output.endswith('\n') else '\n')
            command_results.append({'name': command['name'], 'argv': argv, 'startedAt': started_at, 'finishedAt': utc_now(), 'status': status, 'returnCode': return_code, 'output': output})
            if status != 'passed' and (not args.keep_going):
                break
        inputs_after = verification_input_identity(repo, load_json(repo / ACTIVE_TASK_PATH), policy, config)
        passed = inputs_before == inputs_after and len(command_results) == len(config['profiles'][profile]) and all((x['status'] == 'passed' for x in command_results))
        verification_record = {'schemaVersion': 2, 'taskId': active_task['taskId'], 'profile': profile, 'recordedAt': utc_now(), 'identityBefore': inputs_before, 'identityAfter': inputs_after, 'passed': passed, 'commands': command_results}
        write_json_atomically(repo / RUNTIME_DIRECTORY / 'runs' / active_task['taskId'] / f'{uuid.uuid4().hex}.json', verification_record)
        write_json_atomically(repo / RUNTIME_DIRECTORY / 'verification' / f'{profile}.json', verification_record)
        print(f"{profile}: {('PASSED' if passed else 'FAILED OR INCOMPLETE')}")
        failed |= not passed
    if failed:
        raise SystemExit(1)

def record_task_disposition(repo: Path, args: argparse.Namespace, completed: bool) -> None:
    """Record an explicit incomplete pause or verified implementation handoff. Preserve runs; neither transition approves release."""
    active_task = load_json(repo / ACTIVE_TASK_PATH)
    if completed:
        verification_gaps = required_verification_gaps(repo)
        if verification_gaps:
            raise SetupError('; '.join(verification_gaps))
    disposition_record = {'recordedAt': utc_now(), 'disposition': 'implementation-handoff' if completed else 'paused-incomplete', 'reason': args.reason, 'evidenceReference': args.evidence_reference, 'active': active_task}
    write_json_atomically(repo / RUNTIME_DIRECTORY / 'handoffs' / f"{active_task['taskId']}-{uuid.uuid4().hex}.json", disposition_record)
    if completed:
        (repo / ACTIVE_TASK_PATH).unlink()
    else:
        active_task['paused'] = True
        active_task['pauseReason'] = args.reason
        write_json_atomically(repo / ACTIVE_TASK_PATH, active_task)
    print(disposition_record['disposition'] + '. This does not approve, merge, deploy or close an Issue.')

def resume_task(repo: Path, args: argparse.Namespace) -> None:
    """Resume an explicitly paused task with a new evidence identity and owner decision reference."""
    previous_task = load_json(repo / ACTIVE_TASK_PATH)
    if not previous_task.get('paused'):
        raise SetupError('Only an explicitly paused task may be resumed.')
    policy, config = load_verification_controls(repo)
    route = policy['routes'][previous_task['riskClass']]
    if route['priorBaselineRequired']:
        baseline = require_repository_file(repo, previous_task['baseline'])
        if git_output_bytes(repo, 'show', f"HEAD:{previous_task['baseline']}") != baseline.read_bytes():
            raise SetupError('Required prior baseline is not unchanged in HEAD.')
    write_json_atomically(repo / RUNTIME_DIRECTORY / 'handoffs' / f"{previous_task['taskId']}-resume-{uuid.uuid4().hex}.json", {'disposition': 'superseded-on-explicit-resume', 'decisionReference': args.decision_reference, 'active': previous_task})
    resumed_task = {k: v for k, v in previous_task.items() if k not in {'paused', 'pauseReason'}}
    resumed_task.update(taskId=uuid.uuid4().hex, startedAt=utc_now(), requiredProfiles=route['requiredProfiles'], policyDigest=json_content_digest(policy), configurationDigest=json_content_digest(config), resumeDecisionReference=args.decision_reference)
    write_json_atomically(repo / ACTIVE_TASK_PATH, resumed_task)
    print('Resumed with a new evidence identity; old runs cannot satisfy this task.')

def main() -> int:
    """Expose explicit authorised local lifecycle subcommands."""
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    snapshot_parser = sub.add_parser('snapshot')
    snapshot_parser.add_argument('issue', type=int)
    snapshot_parser.add_argument('--version', required=True, type=int)
    snapshot_parser.add_argument('--accepted-by', required=True)
    snapshot_parser.add_argument('--accepted-at', required=True)
    snapshot_parser.add_argument('--approval-reference', required=True)
    snapshot_parser.set_defaults(function=capture_issue_baseline)
    begin_parser = sub.add_parser('begin')
    begin_parser.add_argument('task')
    begin_parser.add_argument('--risk', required=True, choices=['R0', 'R1', 'R2', 'R3'])
    begin_parser.add_argument('--baseline')
    begin_parser.add_argument('--intent-reference', required=True)
    begin_parser.add_argument('--purpose', required=True)
    begin_parser.add_argument('--new-functionality', action=argparse.BooleanOptionalAction, required=True,
                              help='Declare whether this task introduces or implements new functionality.')
    begin_parser.add_argument('--software-selection-reference',
                              help='Reference to completed reuse/version/licence research; mandatory for new functionality.')
    begin_parser.set_defaults(function=begin_task)
    verify_parser = sub.add_parser('verify')
    verify_parser.add_argument('--profile')
    verify_parser.add_argument('--keep-going', action='store_true')
    verify_parser.set_defaults(function=verify_task)
    resume_parser = sub.add_parser('resume')
    resume_parser.add_argument('--decision-reference', required=True)
    resume_parser.set_defaults(function=resume_task)
    status_parser = sub.add_parser('status')
    status_parser.set_defaults(function=lambda repo, args: print(json.dumps(load_json(repo / ACTIVE_TASK_PATH), indent=2)))
    for name, completed in [('handoff', True), ('pause', False)]:
        disposition_parser = sub.add_parser(name)
        disposition_parser.add_argument('--reason', required=True)
        disposition_parser.add_argument('--evidence-reference', required=True)
        disposition_parser.add_argument('--acknowledge-retained-evidence', required=True, action='store_true')
        disposition_parser.set_defaults(function=lambda repo, args, is_complete=completed: record_task_disposition(repo, args, is_complete))
    args = parser.parse_args()
    try:
        args.function(derive_repo_from_script(__file__), args)
        return 0
    except (SetupError, OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1
if __name__ == '__main__':
    raise SystemExit(main())
