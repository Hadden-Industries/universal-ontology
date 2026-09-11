#!/usr/bin/env python3
"""Check this WP6 deliverable's consistency, not SDLC implementation behavior."""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    documents = {
        'plan': root / 'wp6-trusted-baseline-and-preflight-implementation-plan-2026-09-10.md',
        'policy': root / 'wp6-policy-amendments.proposed.md',
        'worksheet': root / 'wp6-preflight-and-remote-handoff.proposed.md',
        'catalogue': root / 'wp6-verification-catalogue.proposed.json',
        'probe': root / 'wp6-baseline-boundary-check-2026-09-10.json',
        'probeSource': root / 'wp6-support/baseline-boundary-probe.py',
    }
    text = {key: path.read_bytes().decode('utf-8', 'strict') for key, path in documents.items()}
    catalogue = json.loads(text['catalogue'])
    probe = json.loads(text['probe'])
    checks = []
    def check(name: str, condition: bool, scope: str = 'artifact consistency') -> None:
        checks.append({'name': name, 'passed': bool(condition), 'scope': scope})
    check('all_payloads_strict_utf8', len(text) == len(documents))
    check('main_retains_parent_wp6_title', text['plan'].startswith('# WP6 — Reuse the accepted-plan adaptation and align local/remote preflight'))
    check('parent_a11_a12_present', all(x in text['plan'] for x in ('A11','A12')))
    check('eight_ordered_slices', re.findall(r'^### WP6\.(\d) —', text['plan'], re.M) == [str(i) for i in range(1,9)])
    check('forty_catalogue_rows', catalogue['scenarioCount'] == len(catalogue['scenarios']) == 40)
    ids = [row['id'] for row in catalogue['scenarios']]
    check('ordered_unique_test_ids', ids == [f'T6{i:02}' for i in range(1,41)] and len(set(ids)) == 40)
    main_ids = re.findall(r'^\| (T6\d\d) \|', text['plan'], re.M)
    check('main_and_catalogue_ids_agree', main_ids == ids)
    check('all_implementation_tests_not_run', all(row['executionStatus'] == 'not-run' and row['evidence'] is None for row in catalogue['scenarios']))
    check('two_operational_exercises', [row['id'] for row in catalogue['operationalExercises']] == ['O61','O62'])
    check('operational_exercises_not_run', all(row['executionStatus'] == 'not-run' and row['evidence'] is None for row in catalogue['operationalExercises']))
    check('twelve_acceptance_criteria', [row['id'] for row in catalogue['acceptanceCriteria']] == [f'AC6-{i:02}' for i in range(1,13)])
    check('acceptance_not_assessed', all(row['acceptanceStatus'] == 'not-assessed' for row in catalogue['acceptanceCriteria']))
    for row in catalogue['scenarios']:
        expected = f"| {row['id']} | {row['scenario']} | {row['boundaryAndExpectedResult']} |"
        if expected not in text['plan']:
            check('scenario_text_exact_agreement', False); break
    else:
        check('scenario_text_exact_agreement', True)
    check('research_check_count_is_eighteen', len(probe['checks']) == 18)
    check('research_records_all_pass', all(c['passed'] for c in probe['checks']))
    check('research_runtime_is_recorded', all(probe['environment'].get(k) for k in ('python','platform','git')))
    check('research_source_syntax_valid', isinstance(ast.parse(text['probeSource']), ast.Module))
    code = re.findall(r'```python\n(.*?)\n```', text['worksheet'], re.S)
    check('worksheet_recipe_syntax_valid_not_executed', len(code) == 1 and isinstance(ast.parse(code[0]), ast.Module))
    check('worksheet_marks_local_input_not_event', 'notAGitHubEvent' in code[0] and 'notHumanApproval' in code[0])
    check('child_environment_assignment_not_parent_mutation', 'child_env = dict(os.environ)' in code[0] and not re.search(r'os\.environ\[[^\]]+\]\s*=', code[0]))
    check('recipe_executes_trusted_existing_script', 'scripts/validate_sdlc_pr.py' in code[0] and 'cwd=policy_root' in code[0])
    check('recipe_captures_binary_outputs', 'stdout.bin' in code[0] and 'stderr.bin' in code[0] and 'open("xb")' in code[0])
    check('recipe_keeps_started_and_finished_separate', 'started.json' in code[0] and 'finished.json' in code[0])
    check('no_new_preflight_cli_selected', 'Do not add `sdlc preflight`' in text['plan'])
    check('acceptance_limit_not_silently_hidden', 'Automated linkage may pass for a syntactically plausible but fabricated reference' in text['plan'])
    check('existing_issue_route_explicit', 'Preserve existing Issue-snapshot behavior' in text['plan'])
    check('two_native_ref_versions_separated', all(x in text['plan'] for x in ('**P**','**B**','**H**','**T**')))
    check('current_linkage_run_retained', '34524389602' in text['plan'] and 'Invalid baseline path' in text['plan'])
    check('current_dependency_run_retained', '34524391937' in text['plan'] and '103029588085' in text['plan'])
    check('dependency_cause_and_threshold_distinct', all(x in text['plan'] for x in ('qs@6.5.5','GHSA-6rw7-vpxm-498p','GHSA-4mjr-xmp4-gh2g','**low**')))
    check('all_disposition_branches_present', all(x in text['plan'] for x in ('D61','D62','D63','D64')))
    check('rerun_and_new_event_distinguished', 'A rerun is not an update event' in text['plan'])
    check('no_default_dependency_policy_change', 'No default source edit for WP6' in text['plan'])
    check('conditional_field_does_not_replace_seven', 'seven actual field lines in place' in text['policy'])
    for key in ('plan','policy','worksheet'):
        check(f'{key}_code_fences_balanced', len(re.findall(r'^```',text[key],re.M)) % 2 == 0)
    links=[]
    for key in ('plan','policy','worksheet'):
        for label,url in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',text[key]):
            if not re.match(r'^[a-z][a-z0-9+.-]*:',url) and not url.startswith('#'):
                links.append((documents[key].parent/url.split('#')[0]).is_file())
    check('relative_companion_links_resolve', bool(links) and all(links))
    check('research_is_explicitly_not_acceptance', 'not T601–T640 or O61/O62 results' in text['plan'])
    report={
        'kind':'wp6-deliverable-consistency-check',
        'recordedAt':datetime.now(timezone.utc).isoformat(),
        'python':sys.version.split()[0],
        'checks':checks,'total':len(checks),'passed':sum(c['passed'] for c in checks),
        'allPassed':all(c['passed'] for c in checks),
        'inputs':[{'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in documents.values()],
        'limitations':['Checks validate the delivered documents, catalogue and retained research report only.','No proposed validator, live token, native acceptance gate, Windows host or remote CI was executed by this script.','Syntax checks did not execute the worksheet recipe.','ZIP integrity is checked separately after packaging.']}
    with args.out.open('x',encoding='utf-8',newline='\n') as out:
        json.dump(report,out,ensure_ascii=False,indent=2);out.write('\n')
    print(json.dumps({'total':report['total'],'passed':report['passed'],'allPassed':report['allPassed']}))
    return 0 if report['allPassed'] else 1

if __name__=='__main__':
    raise SystemExit(main())
