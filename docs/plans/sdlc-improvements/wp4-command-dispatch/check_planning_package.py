#!/usr/bin/env python3
"""Check this delivery package only; never execute diagnostic text or call DCG.

This script uses only standard-library filesystem, JSON, hashing and syntax parsing.
It does not qualify a Windows host, native guard, proposed patch or acceptance test.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import platform
import re
import sys
from pathlib import Path

MAIN = 'wp4-command-dispatch-diagnosis-implementation-plan-2026-09-10.md'

def run_checks(root: Path) -> dict:
    checks = []
    def check(name: str, passed: bool, scope: str) -> None:
        checks.append({'name': name, 'passed': bool(passed), 'scope': scope})
    def digest(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()
    text = (root / MAIN).read_text(encoding='utf-8')
    catalogue = json.loads((root / 'wp4-test-catalogue.proposed.json').read_text(encoding='utf-8'))
    cases = json.loads((root / 'wp4-diagnostic-cases.proposed.json').read_text(encoding='utf-8'))
    sources = json.loads((root / 'sources.json').read_text(encoding='utf-8'))
    check('catalogue-main-identity', catalogue['mainPlanSha256'] == digest((root/MAIN).read_bytes()), 'Projection identity only')
    ids = [x['id'] for x in catalogue['tests']]
    check('thirty-unique-test-identifiers', ids == [f'T4{i:02}' for i in range(1,31)] and len(ids)==len(set(ids)), 'Planned identifiers, not executed tests')
    check('test-statuses-not-run', all(x['executionStatus']=='not-run' for x in catalogue['tests']), 'Truthful preparation status')
    check('two-operational-exercises-not-run', [x['id'] for x in catalogue['operationalExercises']]==['O41','O42'] and all(x['executionStatus']=='not-run' for x in catalogue['operationalExercises']), 'Truthful preparation status')
    main_tests=re.findall(r'^\| (T4\d\d) \| (.*?) \| (.*?) \|$',text,re.M)
    check('catalogue-preserves-authored-observations', main_tests==[(x['id'],x['requiredObservation'],x['responsibility']) for x in catalogue['tests']], 'Document projection consistency, not oracle validity')
    check('eight-implementation-slices', re.findall(r'^### (WP4\.\d) —',text,re.M)==[f'WP4.{i}' for i in range(1,9)], 'Plan structure')
    check('twelve-acceptance-criteria', re.findall(r'^\| (AC4-\d\d) \|',text,re.M)==[f'AC4-{i:02}' for i in range(1,13)], 'Plan structure')
    check('six-conditional-repair-branches', all(x in text for x in ['D4-PRODUCER','D4-HOST','D4-CONSUMER','D4-PARSER','D4-DEPLOYMENT','D4-UPSTREAM-PENDING']), 'Presence, not technical validation')
    source_ids={x['id'] for x in sources['references']}
    cited = {m for block in re.findall(r'\[((?:[PRUH]\d{2})(?:, [PRUH]\d{2})*)\]',text) for m in block.split(', ')}
    check('all-source-references-resolve-in-register', cited <= source_ids, 'Source ID integrity; no URLs fetched')
    check('no-duplicate-source-identifiers', len(source_ids)==len(sources['references']), 'Source register integrity')
    check('transcriptions-are-not-probe-input', cases['notAnInstalledProbeCasesFile'] is True and all('command' not in x for x in cases['cases']), 'Manifest is not the installed probe cases format')
    check('no-invented-historical-wire-hash', all(x['historicalHookRawSha256'] is None for x in cases['cases']), 'Historical provenance explicitly unknown')
    for item in cases['cases']:
        relative=Path(item['file'])
        check(f"{item['id']}-contained-text-file", not relative.is_absolute() and '..' not in relative.parts and relative.suffix=='.txt', 'Package containment and data naming')
        data=(root/relative).read_bytes()
        check(f"{item['id']}-identity", digest(data)==item['transcriptionSha256'] and len(data)==item['transcriptionByteLength'], 'Transcribed package bytes only')
        check(f"{item['id']}-utf8-lf-representation", not data.startswith(b'\xef\xbb\xbf') and b'\r' not in data and data.endswith(b'\n') and data.decode('utf-8').encode('utf-8')==data, 'Chosen package serialization, not original host bytes')
        check(f"{item['id']}-not-run", item['currentExecutionStatus']=='not-run', 'No native execution result claimed')
    ps=(root/cases['cases'][0]['file']).read_text(encoding='utf-8')
    body=ps.split("@'\n",1)[1].rsplit("\n'@",1)[0]
    try:
        ast.parse(body, mode='exec')
        parsed=True
    except SyntaxError:
        parsed=False
    check('embedded-python-syntax-only', parsed, 'ast.parse only: no execution, no PowerShell parsing and no inventory verification')
    blocked=(root/cases['cases'][1]['file']).read_text(encoding='utf-8')
    reduced=(root/cases['cases'][2]['file']).read_text(encoding='utf-8')
    check('different-ripgrep-pattern-sets-retained', blocked!=reduced and '^###.Task' in blocked and '^###.Task' not in reduced and 'Task.13' in reduced, 'Textual non-equivalence, not actual shell interpretation')
    check('webvowl-rule-not-invented', cases['cases'][1]['reportedRule'] is None, 'Reported absence preserved')
    check('native-release-not-executed-or-selected', sources['nativeLatestObserved']['executed'] is False and sources['nativeLatestObserved']['selectedForInstallation'] is False, 'Truthful release research boundary')
    check('supporting-documents-present', all((root/n).is_file() for n in ['README.md','reproductions/README.md','wp4-operator-diagnostic-worksheet.proposed.md','wp4-policy-amendments.proposed.md']), 'Artifact presence')
    check('no-native-executable-bundled', not any(p.suffix.lower() in {'.exe','.dll','.so','.dylib','.msi'} for p in root.rglob('*') if p.is_file()), 'Delivery content only')
    check('main-markdown-fences-balanced', sum(1 for l in text.splitlines() if l.startswith('```')) % 2 == 0, 'Markdown fence count, not visual rendering')
    return {
        'kind':'wp4-delivery-artifact-checks',
        'preparedOn':'2026-09-10',
        'runtime':{'python':sys.version.split()[0],'platform':platform.platform()},
        'passed':all(x['passed'] for x in checks),
        'checkCount':len(checks),
        'checks':checks,
        'scope':'Consistency and syntax of delivered planning artifacts only.',
        'inputIdentities': {p.relative_to(root).as_posix(): digest(p.read_bytes()) for p in sorted(root.rglob('*')) if p.is_file() and (p.suffix in {'.md', '.txt', '.py'} or p.name in {'wp4-test-catalogue.proposed.json', 'wp4-diagnostic-cases.proposed.json', 'sources.json'})},
        'notEstablished':['DCG classification','Original hook payload bytes','Windows/WSL or host interception','Causal repair correctness','Execution of T401–T430 or O41/O42','Runtime deployment or authority'],
    }

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parent)
    parser.add_argument('--output',type=Path,required=True,help='New JSON result path; existing evidence is not overwritten.')
    args=parser.parse_args()
    if args.output.exists() or args.output.is_symlink():
        parser.error('Output already exists; use a new result path.')
    try:
        result=run_checks(args.root.resolve(strict=True))
        with args.output.open('x',encoding='utf-8',newline='\n') as stream:
            json.dump(result,stream,ensure_ascii=False,indent=2)
            stream.write('\n')
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print(f'Artifact checks could not complete: {exc}',file=sys.stderr)
        return 2
    print(f"Artifact checks: {sum(x['passed'] for x in result['checks'])}/{result['checkCount']}; native/host tests: NOT RUN")
    return 0 if result['passed'] else 1

if __name__=='__main__':
    raise SystemExit(main())
