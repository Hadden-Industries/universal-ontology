#!/usr/bin/env python3
"""Check the WP8 planning files only; never execute the proposed qualification."""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import sys

MAIN = 'wp8-product-closure-and-selective-adoption-implementation-plan-2026-09-11.md'
CATALOGUE = 'wp8-verification-catalogue.proposed.json'
OBSERVATIONS = 'wp8-research-observations-2026-09-11.json'
INPUTS = 'wp8-input-identities-2026-09-11.json'
REQUIRED = [MAIN, CATALOGUE, OBSERVATIONS, INPUTS, 'wp8-README.md',
            'wp8-adoption-and-integration-worksheet.proposed.md',
            'wp8-adoption-record-amendments.proposed.md', 'wp8-check-deliverables.py']

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def check(directory: Path, inputs: Path | None) -> dict:
    results: list[dict] = []
    def record(name: str, passed: bool, detail: str) -> None:
        results.append({'check': name, 'result': 'passed' if passed else 'failed', 'detail': detail})
    record('Required payload files exist', all((directory / n).is_file() for n in REQUIRED),
           'Checks planning-package file existence, not completeness of implementation.')
    if results[-1]['result'] == 'failed':
        return {'checks': results, 'passed': False}
    contents = {n: (directory / n).read_text(encoding='utf-8') for n in REQUIRED}
    record('Payloads decode as UTF-8', all(isinstance(t, str) and t for t in contents.values()),
           'Readability only; semantic source text was not normalised by this check.')
    main = contents[MAIN]
    cat = json.loads(contents[CATALOGUE]); obs = json.loads(contents[OBSERVATIONS])
    input_ids = json.loads(contents[INPUTS])['files']
    record('JSON payloads are objects', all(isinstance(x, dict) for x in [cat,obs,input_ids]),
           'Native JSON parsing; not an SDLC schema validation.')
    ids = [x['id'] for x in cat['scenarios']]
    record('36 scenario IDs are unique and contiguous', ids == [f'T{i}' for i in range(801,837)],
           'T801 through T836 are the declared planning catalogue.')
    record('Every scenario remains not-run', all(x.get('status') == 'not-run' for x in cat['scenarios']),
           'No planned product check is relabelled as an executed research check.')
    fields = ['preconditions','procedure','independentOracle','expectedResult','evidenceRequired','limitation']
    record('Every scenario has the defined planning fields',
           all(all(isinstance(x.get(f),str) and x[f].strip() for f in fields) for x in cat['scenarios']),
           'Presence of a proposed oracle does not prove its quality or execution.')
    expected_acs = {f'AC8-{i:02}' for i in range(1,13)}
    found_acs = re.findall(r'\*\*(AC8-\d{2})\*\*',main)
    record('Twelve unique acceptance definitions', len(found_acs)==12 and set(found_acs)==expected_acs,
           'AC8-01 through AC8-12 occur in the acceptance table.')
    record('Scenario acceptance references resolve',
           all(set(x['acceptanceCriteria']) <= expected_acs and x['acceptanceCriteria'] for x in cat['scenarios']),
           'Structural traceability only, not fulfillment.')
    exercise_ids = [x['id'] for x in cat['operationalExercises']]
    record('Four operational IDs and statuses agree', exercise_ids == ['O81','O82','O83','O84'] and
           all(x['status']=='not-run' for x in cat['operationalExercises']),
           'Useful-work exercises have not been performed for this deliverable.')
    record('All acceptance criteria have catalogue coverage',
           set().union(*(set(x['acceptanceCriteria']) for x in cat['scenarios'])) == expected_acs,
           'Coverage is planned, not tested.')
    slices=re.findall(r'^### WP8\.(\d) —',main,re.M)
    record('Eight unique implementation slices', slices==[str(i) for i in range(1,9)],
           'The prose decomposition matches the stated slice count.')
    record('Parent A06 and A14 explicit', '**A06 —' in main and '**A14 —' in main,
           'Both parent acceptance boundaries remain named.')
    source_ids={x['id'] for x in obs['sources']} | {x['id'] for x in obs['suppliedInputs']}
    prose_ids=set(re.findall(r'\b(?:S\d{2}|W\d{2}|P\d)\b',main))
    record('Source identifiers resolve',prose_ids <= source_ids,
           'Source register exists for cited identifiers; this script makes no network requests.')
    record('Source identifiers unique',len(source_ids)==len(obs['sources'])+len(obs['suppliedInputs']),
           'No duplicate source identity aliases.')
    links=[]
    for name in REQUIRED:
        if name.endswith('.md'):
            links += re.findall(r'\]\((wp8-[^)#]+)(?:#[^)]*)?\)',contents[name])
    record('Relative WP8 document links resolve',all((directory / link).is_file() for link in links),
           'Companions are present; external links are not availability-tested.')
    record('Fenced blocks are balanced',all(text.count('```')%2==0 for name,text in contents.items() if name.endswith('.md')),
           'Simple formatting integrity only.')
    record('UO research pin consistent',obs['researchPins']['universalOntologyMain'] in main,
           'Current at the research read, not a future ref assertion.')
    record('WebVOWL research pin consistent',obs['researchPins']['webvowlFeature'] in main,
           'Recorded immutable source identity occurs in plan.')
    record('ONI head/base pins consistent',all(obs['researchPins'][n] in main for n in ['oniHead','oniBase']),
           'The stale PR description is not the selected head.')
    product=obs['oniProductWorkflow']; linkage=obs['oniLinkageWorkflow']
    record('Separate product and linkage observations',product['runId']==34529893438 and product['runAttempt']==1
           and product['conclusion']=='success' and linkage['runId']==34529892678 and linkage['runAttempt']==1
           and linkage['conclusion']=='failure',
           'Checks consistency of the curated observation, not a fresh API read.')
    record('Ten recorded product jobs with actual-step success',product['jobsTotal']==len(product['jobs'])==10
           and len({j['jobId'] for j in product['jobs']})==10
           and all(j['conclusion']=='success' and j['relevantStepConclusion']=='success' for j in product['jobs']),
           'Metadata readback is not independent inspection of produced archive contents.')
    record('Actual header-contract distinction retained',
           'including `""`' in main and 'string or null' in main and 'not impose an empty-string-to-null rewrite' in main,
           'Preserves researched contract instead of copying an obsolete implementation prescription.')
    record('Not an implementation or runtime schema',cat.get('notAnSdlcRuntimeSchema') is True
           and len(obs['notExecuted'])>=7,
           'Planning catalogue and research evidence explicitly limit their claims.')
    record('Archive and user-input gaps are explicit','That input was not supplied in this research' in main,
           'A missing actual description is not replaced silently with a synthetic one.')
    record('Complete original-input identity list retained',len(input_ids)==41
           and all(re.fullmatch(r'[a-f0-9]{64}',v) for v in input_ids.values()),
           '41 supplied files existed before WP8 creation; no source copies are included in the ZIP.')
    if inputs is not None:
        mismatches=[name for name,digest in input_ids.items()
                    if not (inputs/name).is_file() or sha256(inputs/name)!=digest]
        record('All original supplied inputs unchanged',not mismatches,
               'Compared all 41 original input files. Mismatches: '+repr(mismatches))
    else:
        results.append({'check':'All original supplied inputs unchanged','result':'not-checked',
                        'detail':'No original input directory supplied; no preservation claim made by this rerun.'})
    return {'documentKind':'WP8 planning-file checks only','checkedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
            'implementationTestsExecuted':False,'productOrHostQualification':False,
            'inputPreservationChecked':inputs is not None,'passed':all(x['result']!='failed' for x in results),
            'counts':{s:sum(x['result']==s for x in results) for s in ['passed','failed','not-checked']},
            'checks':results,'checkedPayloads':{n:sha256(directory/n) for n in REQUIRED}}

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
    parser.add_argument('--inputs-directory',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():
        parser.error('Output exists; select a new path to preserve prior check evidence.')
    try:
        result=check(args.directory.resolve(),args.inputs_directory.resolve() if args.inputs_directory else None)
        with args.output.open('x',encoding='utf-8',newline='\n') as stream:
            json.dump(result,stream,indent=2,ensure_ascii=False);stream.write('\n')
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print('Planning-file check failed: '+str(exc),file=sys.stderr)
        return 2
    print(json.dumps({'passed':result['passed'],'counts':result.get('counts',{}),'output':str(args.output)}))
    return 0 if result['passed'] else 1
if __name__=='__main__':
    raise SystemExit(main())
