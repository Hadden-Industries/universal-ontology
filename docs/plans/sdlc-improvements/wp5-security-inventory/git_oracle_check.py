#!/usr/bin/env python3
"""Check a WP5 Git fixture/oracle, NOT an installed security selector.

Creates only a new temporary synthetic repository, without remotes or network.
It executes Git, never Codex, native security helpers, workflows or product code.
The output path must be new. All subprocess outcomes are retained in the report.
"""
from __future__ import annotations
import argparse
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.absolute()
    if output.exists() or output.is_symlink():
        parser.error('Refusing to overwrite evidence: choose a new output path.')
    git_executable = shutil.which('git')
    if not git_executable:
        parser.error('Git is required; no native security component will be invoked.')
    report = {
        'kind': 'wp5-native-git-and-exact-set-oracle-mechanical-check',
        'startedAt': utc_now(), 'python': platform.python_version(),
        'platform': platform.platform(), 'scriptSha256': sha256(Path(__file__).read_bytes()),
        'installedCodexSecurityTested': False, 'nativeInventoryHelperExecuted': False,
        'desktopHostTested': False, 'securityScanStarted': False,
        'limitations': [
            'Uses synthetic fresh local Git data, not user repositories.',
            'Does not execute either native inventory helper or validate #820 deployment.',
            'Does not establish Windows/sandbox/plugin/scan capability.',
            'Not a result for T501-T532 or O51/O52.'
        ], 'commands': [], 'checks': []
    }
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith('GIT_')}
    env.update({
        'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull,
        'GIT_TERMINAL_PROMPT': '0', 'GIT_AUTHOR_NAME': 'WP5 synthetic fixture',
        'GIT_AUTHOR_EMAIL': 'wp5-fixture@example.invalid',
        'GIT_COMMITTER_NAME': 'WP5 synthetic fixture',
        'GIT_COMMITTER_EMAIL': 'wp5-fixture@example.invalid',
    })
    def check(name: str, observed: object, expected: object) -> None:
        report['checks'].append({'name': name, 'observed': observed,
                                 'expected': expected, 'passed': observed == expected})

    try:
        with tempfile.TemporaryDirectory(prefix='wp5-git-oracle-') as temp:
            root = Path(temp)
            repo = root / 'synthetic-repo'
            repo.mkdir()
            empty_hooks = root / 'empty-fixture-hooks'
            empty_hooks.mkdir()
            # These command-scoped Git settings isolate the newly owned fixture.
            # They are not writes to any production/user Git or agent configuration.
            def git(*arguments: str) -> bytes:
                argv = [git_executable, '-c', f'core.hooksPath={empty_hooks}',
                        '-c', 'commit.gpgsign=false', '-C', str(repo), *arguments]
                result = subprocess.run(argv, env=env, capture_output=True,
                                        check=False, timeout=20, shell=False)
                report['commands'].append({
                    'argv': argv, 'returnCode': result.returncode,
                    'stdoutBase64': base64.b64encode(result.stdout).decode('ascii'),
                    'stderrBase64': base64.b64encode(result.stderr).decode('ascii'),
                })
                if result.returncode:
                    raise RuntimeError(f'Fixture Git operation failed: {arguments!r}')
                return result.stdout
            def write(relative: str, data: bytes) -> None:
                path = repo / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            def names(data: bytes) -> list[str]:
                return [x.decode('utf-8') for x in data.split(b'\0') if x]
            def statuses(data: bytes) -> list[list[str]]:
                fields = names(data)
                rows: list[list[str]] = []
                i = 0
                while i < len(fields):
                    state = fields[i]
                    n = 2 if state[:1] in {'R', 'C'} else 1
                    if i + n >= len(fields):
                        raise ValueError('Malformed native name/status output.')
                    rows.append(fields[i:i+n+1])
                    i += n+1
                return rows
            def commit(message: str, paths: list[str]) -> str:
                git('add', '--', *paths)
                git('commit', '-qm', message)
                return git('rev-parse', 'HEAD').decode('ascii').strip()

            report['gitVersion'] = git('--version').decode('utf-8').strip()
            git('init', '-q')
            workflow = b'name: WP5 fixture\non: workflow_dispatch\npermissions: {}\njobs: {}\n'
            base_paths = [
                '.gitignore', '.github/workflows/keep.yml',
                '.github/workflows/delete.yml', '.github/workflows/old.yml',
                'src/handler.py', 'README.md',
            ]
            write('.gitignore', b'ignored*\n')
            for p in base_paths[1:4]:
                write(p, workflow)
            write('src/handler.py', b'answer = 1\n')
            write('README.md', b'baseline\n')
            base = commit('Synthetic WP5 baseline', base_paths)
            write('.github/workflows/keep.yml', workflow.replace(b'WP5 fixture', b'WP5 changed'))
            write('.github/workflows/added.yaml', workflow + b'# added\n')
            write('.github/workflows/évidence flow.yml', workflow + b'# unicode\n')
            (repo / '.github/workflows/delete.yml').unlink()
            (repo / '.github/workflows/old.yml').rename(repo / '.github/workflows/new.yml')
            write('src/handler.py', b'answer = 2\n')
            write('README.md', b'candidate\n')
            changed_paths = [
                '.github/workflows/keep.yml', '.github/workflows/added.yaml',
                '.github/workflows/évidence flow.yml', '.github/workflows/delete.yml',
                '.github/workflows/old.yml', '.github/workflows/new.yml',
                'src/handler.py', 'README.md',
            ]
            head = commit('Synthetic WP5 candidate', changed_paths)
            raw = git('diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z',
                      '--no-renames', base, head, '--')
            observed = statuses(raw)
            expected = sorted([
                ['M', '.github/workflows/keep.yml'], ['A', '.github/workflows/added.yaml'],
                ['A', '.github/workflows/évidence flow.yml'], ['D', '.github/workflows/delete.yml'],
                ['D', '.github/workflows/old.yml'], ['A', '.github/workflows/new.yml'],
                ['M', 'src/handler.py'], ['M', 'README.md'],
            ], key=lambda row: row[1])
            check('complete no-renames path/status obligations', sorted(observed, key=lambda r: r[1]), expected)
            check('Unicode and spaces retain one exact path',
                  sum(row[1] == '.github/workflows/évidence flow.yml' for row in observed), 1)
            rename_rows = statuses(git('diff', '--name-status', '-z', '--find-renames=100%', base, head, '--'))
            # Two baseline files have identical bytes; native rename pairing can
            # choose either deleted source. The complete obligation set above is
            # deliberately not derived from that heuristic pairing.
            pairs = [row for row in rename_rows if row[0].startswith('R')]
            check('rename represents both an old and a new path',
                  any(len(r) == 3 and r[1] in {'.github/workflows/old.yml', '.github/workflows/delete.yml'}
                      and r[2] == '.github/workflows/new.yml' for r in pairs), True)
            check('deleted workflow content readable at baseline',
                  git('show', f'{base}:.github/workflows/delete.yml').decode('utf-8'), workflow.decode('utf-8'))
            committed_keep = git('show', f'{head}:.github/workflows/keep.yml')
            staged = workflow + b'# staged-only marker\n'
            working = workflow + b'# different working marker\n'
            write('.github/workflows/keep.yml', staged)
            git('add', '--', '.github/workflows/keep.yml')
            write('.github/workflows/keep.yml', working)
            check('committed range unaffected by subsequent local edits',
                  git('diff', '--name-status', '-z', '--no-renames', base, head, '--'), raw)
            check('head blob remains its committed content',
                  git('show', f'{head}:.github/workflows/keep.yml'), committed_keep)
            check('index stores the independently staged bytes',
                  git('show', ':.github/workflows/keep.yml'), staged)
            check('working file is a distinct content side',
                  (repo / '.github/workflows/keep.yml').read_bytes(), working)
            index_only = '.github/workflows/index-only.yml'
            write(index_only, workflow)
            git('add', '--', index_only)
            (repo / index_only).unlink()
            index_paths = names(git('diff', '--cached', '--name-only', '-z', head, '--'))
            check('staged added path survives filesystem absence',
                  [index_only in index_paths, (repo / index_only).exists()], [True, False])
            check('index-only file content remains retrievable', git('show', f':{index_only}'), workflow)
            write('.github/workflows/untracked.yaml', workflow)
            write('.github/workflows/ignored-local.yaml', workflow)
            check('non-ignored untracked path set is exact',
                  names(git('ls-files', '--others', '--exclude-standard', '-z')),
                  ['.github/workflows/untracked.yaml'])
            expected_set = {'.github/workflows/build.yml', 'src/handler.py'}
            control_set = {'.github/scripts/support.py', 'src/handler.py'}
            check('equal-count substitution detected by exact set comparison',
                  {'countsEqual': len(expected_set) == len(control_set),
                   'missing': sorted(expected_set - control_set),
                   'unexpected': sorted(control_set - expected_set)},
                  {'countsEqual': True, 'missing': ['.github/workflows/build.yml'],
                   'unexpected': ['.github/scripts/support.py']})
            report['fixture'] = {'base': base, 'head': head,
                                 'containsRemote': bool(git('remote').strip())}
    except Exception as exc:
        report['error'] = f'{type(exc).__name__}: {exc}'
    # Bytes in check values are represented explicitly rather than locale-decoded.
    def encode(value: object) -> object:
        if isinstance(value, bytes):
            return {'base64': base64.b64encode(value).decode('ascii'), 'sha256': sha256(value)}
        raise TypeError(f'Unsupported report value {type(value).__name__}')
    report['finishedAt'] = utc_now()
    report['passed'] = not report.get('error') and len(report['checks']) == 12 and all(c['passed'] for c in report['checks'])
    report['checksTotal'] = len(report['checks'])
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2, default=encode)
        stream.write('\n')
    print(f"Git/oracle mechanical check: {report['checksTotal']} checks; passed={report['passed']}. No security helper or scan executed.")
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
