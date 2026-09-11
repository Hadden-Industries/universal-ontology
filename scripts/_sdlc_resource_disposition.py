"""Bounded local handoff metadata and read-only native resource observations.

Declarations are not approvals. This module never removes a resource, executes a
recorded command, fetches a reference, or reads another worktree's runtime store.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import tempfile
import uuid

from _commands import SetupError, require_command
from _sdlc_state import ACTIVE_TASK_PATH, reject_redirected_path, validate_document

SCHEMA = 'resource-disposition.schema.json'
HANDOFFS = Path('.sdlc/runtime/handoffs')
MAX_RECORD_BYTES = 256 * 1024
MAX_HANDOFF_FILES = 4096
MAX_TOTAL_BYTES = 16 * 1024 * 1024
GIT_TIMEOUT_SECONDS = 15


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key.')
        result[key] = value
    return result


def reject_constant(_value):
    raise ValueError('Non-JSON numeric constant.')


def read_metadata(path: Path) -> tuple[object, bytes]:
    reject_redirected_path(path)
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_RECORD_BYTES:
        raise SetupError('Metadata must be a bounded regular file.')
    with path.open('rb') as stream:
        raw = stream.read(MAX_RECORD_BYTES + 1)
    after = path.lstat()
    identity_fields = ('st_dev', 'st_ino', 'st_mode', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
    if len(raw) > MAX_RECORD_BYTES or any(getattr(before, key) != getattr(after, key)
                                         for key in identity_fields):
        raise SetupError('Metadata exceeded its bound or changed during reading.')
    try:
        document = json.loads(raw.decode('utf-8'), object_pairs_hook=reject_duplicate_keys,
                              parse_constant=reject_constant)
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise SetupError(f'Invalid metadata encoding or JSON ({type(exc).__name__}).') from exc
    return document, raw


def git_metadata(repo: Path, *arguments: str) -> bytes:
    result = subprocess.run([require_command('git'), '--no-optional-locks', '-C', str(repo),
        *arguments], capture_output=True, timeout=GIT_TIMEOUT_SECONDS)
    if result.returncode:
        raise SetupError(f'Native Git metadata query failed with exit {result.returncode}.')
    return result.stdout


def parse_worktrees(raw: bytes) -> list[dict]:
    """Read Git's porcelain -z fields, including unknown additive metadata."""
    if not raw or not raw.endswith(b'\0\0'):
        raise SetupError('Incomplete native worktree inventory termination.')
    entries = []
    for group in raw[:-2].split(b'\0\0'):
        fields = {}
        for field in group.split(b'\0'):
            key, separator, value = field.partition(b' ')
            name = key.decode('utf-8')
            if not name or name in fields:
                raise SetupError('Empty or duplicate native worktree field.')
            fields[name] = value.decode('utf-8') if separator else True
        if not isinstance(fields.get('worktree'), str) or not Path(fields['worktree']).is_absolute():
            raise SetupError('Missing absolute native worktree path.')
        if 'bare' in fields:
            if fields['bare'] is not True or any(key in fields for key in ('HEAD', 'branch', 'detached')):
                raise SetupError('Malformed bare worktree metadata.')
        elif (not isinstance(fields.get('HEAD'), str)
                or re.fullmatch(r'[0-9a-f]{40}([0-9a-f]{24})?', fields['HEAD']) is None
                or ('branch' in fields) == ('detached' in fields)
                or ('detached' in fields and fields['detached'] is not True)
                or ('branch' in fields and (not isinstance(fields['branch'], str)
                    or not fields['branch'].startswith('refs/heads/')))):
            raise SetupError('Incomplete native worktree attachment.')
        entries.append({'nativePath': fields['worktree'], 'nativeHead': fields.get('HEAD'),
            'nativeAttachment': fields.get('branch', 'bare' if fields.get('bare') else 'detached'),
            'nativeMetadata': fields})
    return entries


def scope_and_inventory(repo: Path):
    common = git_metadata(repo, 'rev-parse', '--path-format=absolute', '--git-common-dir')
    common_path = common.decode('utf-8').removesuffix('\n')
    if not Path(common_path).is_absolute():
        raise SetupError('Native common directory is not absolute.')
    scope = {'coordinatorRoot': str(repo), 'gitCommonDirectory': common_path,
             'host': socket.gethostname()}
    raw = git_metadata(repo, 'worktree', 'list', '--porcelain', '-z')
    return scope, parse_worktrees(raw), raw


def path_key(path: str | Path) -> str:
    # Native platform semantics, without following a caller-supplied path.
    return os.path.normcase(os.path.normpath(str(path)))


def contains(parent: str | Path, child: str | Path) -> bool:
    try:
        return os.path.commonpath([path_key(parent), path_key(child)]) == path_key(parent)
    except ValueError:
        return False


def problem(code: str, location: str | Path, explanation: str) -> dict:
    return {'code': code, 'location': str(location), 'explanation': explanation}


def metadata_identity(path: Path):
    reject_redirected_path(path)
    try:
        info = path.lstat()
        return (info.st_dev, info.st_ino, info.st_mode, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
    except FileNotFoundError:
        return None


def matches_scope(record: dict, scope: dict) -> bool:
    return (record['scope']['host'] == scope['host']
        and path_key(record['scope']['coordinatorRoot']) == path_key(scope['coordinatorRoot'])
        and scope['gitCommonDirectory'] is not None
        and path_key(record['scope']['gitCommonDirectory']) == path_key(scope['gitCommonDirectory']))


def handoff_listing(repo: Path) -> dict:
    directory = repo / HANDOFFS
    reject_redirected_path(directory)
    try:
        entries = directory.iterdir()
        result = {}
        for ordinal, path in enumerate(entries):
            if ordinal >= MAX_HANDOFF_FILES:
                raise SetupError('Handoff file-count limit exceeded.')
            if path.suffix == '.json':
                info = path.lstat()
                result[path.name] = (info.st_size, info.st_mtime_ns, info.st_ino, info.st_mode, info.st_ctime_ns)
        return result
    except FileNotFoundError:
        # A missing handoff directory is normal; an entry disappearing is movement.
        if directory.parent.is_dir() and not os.path.lexists(directory):
            return {}
        if not os.path.lexists(repo / '.sdlc/runtime'):
            return {}
        raise


def read_handoffs(repo: Path):
    records, problems, legacy = {}, [], 0
    listing = handoff_listing(repo)
    total = 0
    for name, metadata in listing.items():
        path = repo / HANDOFFS / name
        total += metadata[0]
        if total > MAX_TOTAL_BYTES:
            problems.append(problem('read-limit', HANDOFFS, 'Aggregate metadata limit exceeded.'))
            break
        try:
            document, _ = read_metadata(path)
            if not isinstance(document, dict):
                raise SetupError('Handoff is not an object.')
            if document.get('recordType') == 'resource-disposition':
                validate_document(repo, SCHEMA, document)
                identity = document['recordId']
                if name != f'resource-{identity}.json' or identity in records:
                    raise SetupError('Resource record filename/identity mismatch.')
                records[identity] = document
            elif document.get('disposition') in {
                    'paused-incomplete', 'implementation-handoff', 'superseded-on-explicit-resume'}:
                legacy += 1
            else:
                raise SetupError('Unsupported handoff record.')
        except (OSError, ValueError, SetupError, RecursionError) as exc:
            problems.append(problem('invalid-handoff', name,
                f'Cannot consume handoff metadata ({type(exc).__name__}); original retained.'))
    return records, legacy, problems, listing


def resource_leaves(records: dict):
    """Resolve explicit history without selecting winners by time or filename."""
    problems, superseded = [], set()
    for identity, record in records.items():
        for predecessor in record['entry']['supersedes']:
            prior = records.get(predecessor)
            if predecessor == identity or prior is None or (
                    prior['entry']['resourceId'] != record['entry']['resourceId']):
                problems.append(problem('invalid-supersession', identity,
                    'A predecessor is missing, self-referential or belongs to another resource.'))
            else:
                superseded.add(predecessor)
    # Iterative traversal keeps bounded but deep histories off Python's call stack.
    completed = set()
    for origin in records:
        stack, visiting = [(origin, False)], set()
        while stack:
            identity, leaving = stack.pop()
            if leaving:
                visiting.discard(identity)
                completed.add(identity)
            elif identity in visiting:
                problems.append(problem('cyclic-supersession', origin, 'Resource history contains a cycle.'))
                break
            elif identity not in completed and identity in records:
                visiting.add(identity)
                stack.append((identity, True))
                stack.extend((prior, False) for prior in records[identity]['entry']['supersedes'])
    leaves = {}
    for identity, record in records.items():
        if identity not in superseded or problems:
            leaves.setdefault(record['entry']['resourceId'], []).append(record)
    if not problems:
        for resource, snapshots in leaves.items():
            if len(snapshots) != 1:
                problems.append(problem('conflicting-snapshots', resource,
                    'Multiple unsuperseded snapshots require explicit reconciliation.'))
    return leaves, problems


def observe_member(path: str) -> dict:
    try:
        target = Path(path)
        if not target.is_absolute():
            raise SetupError('Resource path is not absolute on this host.')
        reject_redirected_path(target)
        target.lstat()
        return {'filesystem': 'present', 'containingLocationAccessible': True}
    except FileNotFoundError:
        try:
            parent = target.parent.lstat()
            if not stat.S_ISDIR(parent.st_mode):
                raise SetupError('Containing location is not a directory.')
            return {'filesystem': 'absent', 'containingLocationAccessible': True}
        except (OSError, SetupError):
            return {'filesystem': 'unknown', 'containingLocationAccessible': False}
    except (OSError, SetupError):
        return {'filesystem': 'unknown', 'containingLocationAccessible': False}


def resource_observation(record: dict, scope: dict, inventory: list):
    entry, observations, attention = record['entry'], [], []
    for location in entry['locations']:
        matched = next((worktree for worktree in inventory
                        if path_key(worktree['nativePath']) == path_key(location)), None)
        observation = {'path': location, 'inspection': 'not-inspected'}
        if entry['host'] == scope['host'] and entry['kind'] == 'worktree' and matched:
            observation.update(matched)
            observation.update(observe_member(location))
            observation['inspection'] = 'native-registration-and-metadata'
            observation['nestedWorktrees'] = [item['nativePath'] for item in inventory
                if path_key(item['nativePath']) != path_key(location) and contains(location, item['nativePath'])]
            if observation['nestedWorktrees']:
                attention.append('nested-registration')
            if entry['candidate']['head'] and entry['candidate']['head'] != matched['nativeHead']:
                attention.append('candidate-head-changed')
            if entry['disposition'] == 'removed-confirmed':
                attention.append('new-or-reappeared-registration')
            if observation['filesystem'] == 'unknown':
                attention.append('metadata-read-unavailable')
        else:
            observation['reason'] = 'Off-host, unregistered or outside default metadata inspection scope.'
        observations.append(observation)
    if entry['disposition'] == 'eligible-for-approved-removal':
        attention.append('recorded-eligibility-requires-fresh-operator-inspection')
    return {'recorded': record, 'currentObservation': {'members': observations,
        'dirtyInputs': 'not-inspected; unchanged HEAD does not establish unchanged content'},
        'attention': list(dict.fromkeys(attention))}


def build_status(repo: Path) -> dict:
    report = {'statusFormatVersion': 1, 'observedAt': now(), 'scope': {
        'coordinatorRoot': str(repo), 'gitCommonDirectory': None, 'host': socket.gethostname(),
        'recordLocation': str(repo / HANDOFFS)}, 'active': None, 'activeReadState': 'absent',
        'resourceDispositions': [], 'unattributedWorktrees': [],
        'legacyHandoffsWithoutResourceMetadata': 0, 'readProblems': []}
    active_path = repo / ACTIVE_TASK_PATH
    active_identity = None
    try:
        active_identity = metadata_identity(active_path)
        active, _ = read_metadata(active_path)
        if not isinstance(active, dict) or active.get('schemaVersion') != 2 or any(
                not isinstance(active.get(key), str) or not active[key]
                for key in ('taskId', 'task', 'riskClass')):
            raise SetupError('Unsupported or malformed active task.')
        report.update(active=active, activeReadState='present')
    except FileNotFoundError:
        pass
    except (OSError, SetupError, ValueError) as exc:
        report['activeReadState'] = 'unreadable' if isinstance(exc, OSError) else 'invalid'
        report['readProblems'].append(problem('active-read', ACTIVE_TASK_PATH,
            f'Active metadata is unavailable ({type(exc).__name__}).'))
    inventory = []
    try:
        scope, inventory, raw_inventory = scope_and_inventory(repo)
        report['scope'].update(scope)
    except (OSError, SetupError, ValueError, subprocess.TimeoutExpired) as exc:
        raw_inventory = None
        report['readProblems'].append(problem('native-inventory', repo,
            f'Native inventory is incomplete ({type(exc).__name__}).'))
    try:
        records, legacy, problems, listing = read_handoffs(repo)
        leaves, graph_problems = resource_leaves(records)
        report['legacyHandoffsWithoutResourceMetadata'] = legacy
        report['readProblems'].extend(problems + graph_problems)
        for snapshots in leaves.values():
            for record in snapshots:
                local_scope = matches_scope(record, report['scope'])
                if not local_scope:
                    report['readProblems'].append(problem('record-scope', record['recordId'],
                        'Record scope does not match this coordinator; resource locations remain uninspected.'))
                observation = resource_observation(record, report['scope'], inventory if local_scope else [])
                report['resourceDispositions'].append(observation)
                if 'metadata-read-unavailable' in observation['attention']:
                    report['readProblems'].append(problem('resource-metadata', record['recordId'],
                        'Registered resource metadata is unavailable; its disposition is retained.'))
        if listing != handoff_listing(repo) or (raw_inventory is not None and raw_inventory !=
                git_metadata(repo, 'worktree', 'list', '--porcelain', '-z')):
            report['readProblems'].append(problem('observation-changed', HANDOFFS,
                'Metadata or inventory changed during the observation; read status again.'))
    except (OSError, SetupError, ValueError, subprocess.TimeoutExpired) as exc:
        report['readProblems'].append(problem('handoff-read', HANDOFFS,
            f'Handoff view is incomplete ({type(exc).__name__}).'))
    try:
        if active_identity != metadata_identity(active_path):
            report['readProblems'].append(problem('observation-changed', ACTIVE_TASK_PATH,
                'Active metadata changed during the observation; read status again.'))
    except (OSError, SetupError) as exc:
        report['readProblems'].append(problem('active-read', ACTIVE_TASK_PATH,
            f'Cannot recheck active metadata ({type(exc).__name__}).'))
    attributed = {path_key(location) for item in report['resourceDispositions']
        if item['recorded']['entry']['host'] == report['scope']['host']
        and item['recorded']['entry']['kind'] == 'worktree'
        and matches_scope(item['recorded'], report['scope'])
        for location in item['recorded']['entry']['locations']}
    report['unattributedWorktrees'] = [dict(item, observation='Unattributed in this coordinator view.')
        for item in inventory if path_key(item['nativePath']) not in attributed]
    return report


def publish_record(path: Path, raw: bytes) -> None:
    reject_redirected_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix='.resource-preparation-', dir=path.parent)
    candidate = Path(name)
    published = False
    try:
        try:
            stream = os.fdopen(descriptor, 'wb')
        except BaseException:
            os.close(descriptor)
            raise
        primary = None
        try:
            stream.write(raw)
            stream.flush()
        except BaseException as exc:
            primary = exc
            raise
        finally:
            try:
                stream.close()
            except BaseException as closing:
                if primary is None:
                    raise
                primary.add_note(f'Secondary close failure: {type(closing).__name__}.')
        reject_redirected_path(path)
        reject_redirected_path(candidate)
        os.link(candidate, path)
        published = True
        if read_metadata(path)[1] != raw:
            raise SetupError('Published record readback differs.')
        candidate.unlink()
    except (OSError, ValueError, SetupError, KeyboardInterrupt) as exc:
        state = 'published; inspect before retry' if published else 'not published'
        raise SetupError(f'Resource record {state} ({type(exc).__name__}); '
                         f'preparation retained at {candidate}; target {path}.') from exc


def record_disposition(repo: Path, relative_input: str) -> dict:
    supplied = Path(relative_input)
    if supplied.anchor or '..' in supplied.parts:
        raise SetupError('Expected a contained relative metadata input path.')
    document, original = read_metadata(repo / supplied)
    if not isinstance(document, dict) or document.get('recordType') != 'resource-disposition-input':
        raise SetupError('Expected caller-input resource disposition, not a stored record.')
    validate_document(repo, SCHEMA, document)
    scope, inventory, raw_inventory = scope_and_inventory(repo)
    records, _, problems, _ = read_handoffs(repo)
    if any(not matches_scope(record, scope) for record in records.values()):
        raise SetupError('Existing handoff history contains a different coordinator scope.')
    leaves, graph_problems = resource_leaves(records)
    if problems or any(item['code'] != 'conflicting-snapshots' for item in graph_problems):
        raise SetupError('Existing handoff history is incomplete; preserve and resolve its reported gaps.')
    entry = document['entry']
    resource_id = entry['resourceId']
    if resource_id is not None:
        if resource_id not in leaves or set(entry['supersedes']) != {
                record['recordId'] for record in leaves[resource_id]}:
            raise SetupError('Update must name every current leaf of the existing resource.')
    for location in entry['locations']:
        if entry['host'] == scope['host'] and not Path(location).is_absolute():
            raise SetupError('A same-host resource location must be absolute.')
    if entry['disposition'] in {'eligible-for-approved-removal', 'removed-confirmed'}:
        protected = [str(repo), inventory[0]['nativePath']]
        if entry['host'] == scope['host']:
            resolved_locations = {}
            for location in entry['locations']:
                reject_redirected_path(Path(location))
                # Resolve native short-name aliases only for the explicit local
                # disposal assessment. Retained declarations stay unchanged.
                resolved = Path(location).resolve()
                resolved_locations[location] = resolved
                if any(contains(resolved, root) for root in protected):
                    raise SetupError('Disposal claim includes the coordinator or main worktree.')
                if any(path_key(resolved) != path_key(item['nativePath'])
                       and contains(resolved, item['nativePath']) for item in inventory):
                    raise SetupError('Disposal claim contains an unresolved nested worktree.')
    confirmation = None
    if entry['disposition'] == 'removed-confirmed':
        if entry['host'] != scope['host']:
            raise SetupError('This recorder cannot confirm off-host removal.')
        declared = entry['postRemovalReadback']
        if {member['path'] for member in declared['members']} != set(entry['locations']):
            raise SetupError('Declared readback members differ from the resource.')
        members = []
        for location in entry['locations']:
            if any(contains(resolved_locations[location], item['nativePath']) for item in inventory):
                raise SetupError('Resource or contained worktree remains registered.')
            observation = observe_member(location)
            if observation['filesystem'] != 'absent' or not observation['containingLocationAccessible']:
                raise SetupError('Fresh exact-path metadata does not establish removal.')
            members.append(dict(path=location, registration='absent', **observation))
        confirmation = {
            'observedAt': now(), 'observedBy': 'native-resource-recorder',
            'inventoryReference': 'native git worktree list --porcelain -z; sha256:'
                                  + hashlib.sha256(raw_inventory).hexdigest(),
            'filesystemReference': 'Native lstat of the exact members and their containing locations, recorded below.',
            # The caller's preservation readback stays in entry.postRemovalReadback.
            # This metadata recorder never reads that evidence or adopts its claim.
            'evidenceReadbackReference': None, 'members': members}
    stored = dict(document, recordType='resource-disposition', recordId=uuid.uuid4().hex,
        recordedAt=now(), inputSha256=hashlib.sha256(original).hexdigest(), scope=scope,
        confirmationObservation=confirmation)
    stored['entry'] = dict(entry, resourceId=resource_id or uuid.uuid4().hex)
    validate_document(repo, SCHEMA, stored)
    raw = (json.dumps(stored, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if len(raw) > MAX_RECORD_BYTES:
        raise SetupError('Stored resource snapshot exceeds the metadata bound.')
    relative = HANDOFFS / f'resource-{stored["recordId"]}.json'
    publish_record(repo / relative, raw)
    return {'recordId': stored['recordId'], 'resourceId': stored['entry']['resourceId'],
            'recordPath': relative.as_posix(), 'result': 'record-retained'}
