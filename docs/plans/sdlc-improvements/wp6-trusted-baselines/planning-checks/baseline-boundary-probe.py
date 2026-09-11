#!/usr/bin/env python3
"""Offline native-Git/codec research, not the proposed SDLC implementation.

Creates only an owned temporary repository. Does not contact GitHub, run candidate
code, authenticate acceptance, install dependencies, or qualify the Windows host.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
from datetime import datetime, timezone


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Choose a new output path; previous observations are preserved.')
    results = []
    def check(name, condition, evidence):
        results.append({'name': name, 'passed': bool(condition), 'evidence': evidence})
    with tempfile.TemporaryDirectory(prefix='wp6 native baseline ') as tmp:
        root = Path(tmp)
        env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
        env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull,
                   GIT_AUTHOR_NAME='WP6 synthetic fixture', GIT_AUTHOR_EMAIL='fixture@example.invalid',
                   GIT_COMMITTER_NAME='WP6 synthetic fixture', GIT_COMMITTER_EMAIL='fixture@example.invalid',
                   GIT_TERMINAL_PROMPT='0')
        calls = []
        def git(*argv, data=None, ok=True):
            proc = subprocess.run(['git', '--no-optional-locks', '-C', str(root), *argv],
                input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, check=False)
            calls.append({'arguments': list(argv), 'exitCode': proc.returncode})
            if ok and proc.returncode:
                raise RuntimeError(proc.stderr.decode('utf-8', 'backslashreplace'))
            return proc
        git('init', '-q')
        p = 'docs/plans/accepted.md'
        file = root / p
        file.parent.mkdir(parents=True)
        text = '# Accepted fixture\n\n## Preserve 漢字 and café\n\n```python\nraise RuntimeError("DATA ONLY")\n```\n'
        raw = text.encode('utf-8')
        file.write_bytes(raw)
        git('add', '--', p); git('commit', '-qm', 'Synthetic baseline')
        b = git('rev-parse', 'HEAD').stdout.decode().strip()
        oid = git('rev-parse', f'{b}:{p}').stdout.decode().strip()
        check('committed_blob_preserves_exact_utf8', git('cat-file', 'blob', oid).stdout == raw,
              {'revision': b, 'blob': oid, 'sha256': hashlib.sha256(raw).hexdigest()})
        (root/'ordinary.txt').write_bytes(b'new behavior\n')
        git('add', '--', 'ordinary.txt'); git('commit', '-qm', 'Synthetic implementation')
        h = git('rev-parse', 'HEAD').stdout.decode().strip()
        check('unchanged_plan_reuses_blob_at_distinct_revisions',
              b != h and git('rev-parse', f'{h}:{p}').stdout.decode().strip() == oid,
              {'base': b, 'head': h, 'blob': oid})
        candidate = 'docs/plans/candidate-only.md'
        (root/candidate).write_bytes(b'# Candidate only\n')
        git('add', '--', candidate); git('commit', '-qm', 'Synthetic candidate-only file')
        absent = git('cat-file', '-e', f'{b}:{candidate}', ok=False)
        check('candidate_only_file_missing_from_base', absent.returncode != 0, {'exitCode': absent.returncode})
        file.write_bytes(raw.replace(b'\n', b'\r\n'))
        check('newline_translation_changes_raw_identity', file.read_bytes() != raw,
              {'originalSha256': hashlib.sha256(raw).hexdigest(), 'changedSha256': hashlib.sha256(file.read_bytes()).hexdigest()})
        check('text_reader_can_hide_newline_change', file.read_text(encoding='utf-8') == text,
              'Text-mode universal-newline equality is not the raw-blob equality contract.')
        file.write_bytes(raw)
        check('bom_is_part_of_byte_identity', hashlib.sha256(b'\xef\xbb\xbf'+raw).digest() != hashlib.sha256(raw).digest(),
              'No decoder or normalization policy was adopted by this probe.')
        a, z = 'café'.encode(), 'cafe\u0301'.encode()
        check('unicode_normalization_forms_have_distinct_bytes', a != z, {'composed': a.hex(), 'decomposed': z.hex()})
        file.write_bytes(raw+b'\n## staged\n'); git('add', '--', p)
        file.write_bytes(raw+b'\n## working\n')
        staged = git('show', f':{p}').stdout
        check('index_and_working_content_are_distinct', staged != file.read_bytes(),
              {'stagedSha256': hashlib.sha256(staged).hexdigest(), 'workingSha256': hashlib.sha256(file.read_bytes()).hexdigest()})
        check('head_blob_ignores_incidental_index_working_edits', git('cat-file','blob', oid).stdout == raw,
              {'originalBlob': oid})
        # Add a symlink as Git data; no host symlink permissions or traversal needed.
        link = 'docs/plans/linked.md'
        link_oid = git('hash-object', '-w', '--stdin', data=b'accepted.md').stdout.decode().strip()
        git('update-index', '--add', '--cacheinfo', f'120000,{link_oid},{link}')
        tree = git('write-tree').stdout.decode().strip()
        row = git('--literal-pathspecs', 'ls-tree', '-z', tree, '--', link).stdout
        check('git_tree_exposes_symlink_mode', row.startswith(b'120000 blob '),
              {'row': row.decode().replace('\0','\\0')})
        check('symlink_blob_contains_link_target_not_target_file', git('cat-file','blob',link_oid).stdout == b'accepted.md',
              {'linkBlob': link_oid})
        regular_row = git('--literal-pathspecs','ls-tree','-z',b,'--',p).stdout
        check('regular_plan_mode_distinguishable', regular_row.startswith(b'100644 blob '),
              {'row': regular_row.decode().replace('\0','\\0')})
        # Establish a distinct mode on the same content object, without mutating accepted history.
        git('update-index','--cacheinfo',f'100755,{oid},{p}')
        t2 = git('write-tree').stdout.decode().strip()
        mode_row = git('--literal-pathspecs','ls-tree','-z',t2,'--',p).stdout
        check('same_blob_can_have_different_tree_mode', mode_row.startswith(b'100755 blob ') and oid.encode() in mode_row,
              {'row': mode_row.decode().replace('\0','\\0')})
        weird = 'docs/plans/évidence[1].md'
        (root/weird).write_bytes(b'# Literal path\n'); git('add','--',weird)
        tree3 = git('write-tree').stdout.decode().strip()
        literal_row = git('--literal-pathspecs','ls-tree','-z',tree3,'--',weird).stdout
        check('literal_path_lookup_preserves_unicode_and_brackets', literal_row.endswith(weird.encode()+b'\0'),
              {'row': literal_row.decode().replace('\0','\\0')})
        try:
            b'\xff\xfe'.decode('utf-8', errors='strict')
            failed = False
        except UnicodeDecodeError:
            failed = True
        check('strict_utf8_rejects_invalid_protocol_bytes', failed, 'No replacement decoding applied.')
        body = '## Preserve — 漢字 ✓\r\nLiteral  spacing\n'
        protocol = json.dumps({'body': body}, ensure_ascii=False).encode('utf-8')
        check('json_utf8_roundtrip_preserves_decoded_body', json.loads(protocol.decode('utf-8'))['body'] == body,
              {'bodySha256': hashlib.sha256(body.encode('utf-8')).hexdigest()})
        check('opaque_markdown_was_not_executed', not (root/'executed').exists(),
              'Only native Git and stdlib codec operations were invoked; the example fenced code was data.')
        check('fixture_has_no_remotes', git('remote').stdout == b'', 'No network operations were invoked.')
        version = git('--version').stdout.decode().strip()
    report = {'kind': 'wp6-native-baseline-boundary-research',
        'recordedAt': datetime.now(timezone.utc).isoformat(),
        'environment': {'python': platform.python_version(), 'platform': platform.platform(), 'git': version},
        'checks': results, 'passed': all(x['passed'] for x in results), 'checkCount': len(results),
        'executedRepositoryValidator': False, 'windowsQualified': False, 'humanAcceptanceAuthenticated': False,
        'limitations': ['Synthetic local Git fixture only; no candidate SDLC implementation was executed.',
            'No GitHub API behavior, live tokens, branch enforcement or operational preflight was qualified.',
            'An unexecuted data string and a matching blob cannot establish owner acceptance.'],
        'nativeCalls': calls}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('x', encoding='utf-8', newline='\n') as out:
        json.dump(report, out, ensure_ascii=False, indent=2); out.write('\n')
    print(f"{sum(c['passed'] for c in results)}/{len(results)} native/codec research checks passed.")
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
