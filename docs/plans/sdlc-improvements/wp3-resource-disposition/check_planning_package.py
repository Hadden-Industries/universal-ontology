#!/usr/bin/env python3
"""Mechanical validation of the proposed WP3 artefacts; not a repository test.

Uses python-jsonschema already available in the research environment. Reads only
this package and, when supplied, hashes named source documents. Writes the named
local JSON result file. It does not contact GitHub, inspect user worktrees,
implement the proposed CLI, execute stored commands or remove anything.
"""
from __future__ import annotations
import argparse
import copy
import datetime as dt
import hashlib
import importlib.metadata
import json
import platform
import sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker


def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--source-directory',type=Path)
    args=p.parse_args()
    root=Path(__file__).resolve().parent
    schema_path=root/'wp3-resource-disposition.schema.proposed.json'
    schema=json.loads(schema_path.read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    validator=Draft202012Validator(schema,format_checker=FormatChecker())
    input_validator=Draft202012Validator({"$schema":schema["$schema"],"$defs":schema["$defs"],"$ref":"#/$defs/input"},format_checker=FormatChecker())
    examples={path.stem:json.loads(path.read_text(encoding='utf-8')) for path in sorted((root/'examples').glob('*.json'))}
    cases=[]
    def check(name:str,document:dict,expected_valid:bool,claim:str='structural-contract',input_only:bool=False):
        errors=list((input_validator if input_only else validator).iter_errors(document))
        valid=not errors
        cases.append({'name':name,'claim':claim,'validationTarget':'caller-input' if input_only else 'root-union','expectedValid':expected_valid,'observedValid':valid,'matchedExpectation':valid==expected_valid,'topLevelErrorCount':len(errors)})
    def changed(example:str,name:str,action):
        d=copy.deepcopy(examples[example]);action(d);check(name,d,False)
    for name,document in examples.items():check('example:'+name,document,True)
    check('caller-input branch accepts its input',examples['held.input'],True,input_only=True)
    check('caller-input branch rejects stored output',examples['held.stored'],False,input_only=True)
    changed('held.input','unknown input field',lambda d:d.update(approvedToDelete=True))
    changed('held.input','unsupported format',lambda d:d.update(schemaVersion=2))
    changed('held.input','writer ID cannot be supplied in input',lambda d:d.update(recordId='a'*32))
    changed('held.input','empty next actor',lambda d:d['entry'].update(nextActor=' '))
    changed('held.input','hold requires specific blocker',lambda d:d['entry'].update(blockers=[]))
    changed('held.input','new resource cannot supersede prior identity',lambda d:d['entry'].update(supersedes=['a'*32]))
    changed('held.input','one worktree cannot name several roots',lambda d:d['entry']['locations'].append('C:/fixture/other'))
    changed('held.input','candidate SHA requires dated observation',lambda d:d['entry']['candidate'].update(head='a'*40))
    changed('retained-for-consumer.input','retention requires unreleased consumer',lambda d:d['entry'].update(consumers=[]))
    changed('preserved-pending-review.input','verified preservation requires readback reference',lambda d:d['entry']['preservation'].update(readbackReference=None))
    changed('preserved-pending-review.input','verified preservation cannot exist solely inside disposable tree',lambda d:d['entry']['preservation'].update(independentOfDisposedTree=False))
    changed('eligible-assessment.input','eligibility cannot retain active consumer',lambda d:d['entry']['consumers'][0].update(state='required'))
    changed('eligible-assessment.input','released consumer requires release reference',lambda d:d['entry']['consumers'][0].update(releaseEvidenceReference=None))
    changed('eligible-assessment.input','eligibility cannot retain incomplete preservation',lambda d:d['entry']['preservation'].update(state='incomplete'))
    changed('eligible-assessment.input','eligibility requires actual assessment reference',lambda d:d['entry'].update(assessmentReference=None))
    changed('eligible-assessment.input','unknown owner without disposal authority cannot assert eligibility',lambda d:d['entry'].update(owner=None))
    changed('eligible-assessment.input','eligibility cannot retain nesting blocker',lambda d:d['entry']['blockers'].append({'kind':'nested-resource','description':'Inner ownership unresolved','reference':None}))
    changed('operator-blocked.input','anticipated restriction is not executed denial',lambda d:d['entry'].update(operation=None))
    changed('operator-blocked.input','denial requires operator request reference',lambda d:d['entry']['operation'].update(operatorRequestReference=None))
    changed('operator-blocked.input','denial requires rule or permission diagnostic',lambda d:d['entry']['operation'].update(denialRule=None))
    d=copy.deepcopy(examples['operator-blocked.input']);d['entry']['operation'].update(denialRule=None,permissionError='PermissionError: access denied (synthetic)');d['entry']['blockers'][-1]['kind']='permission';check('permission denial needs no invented native guard rule',d,True)
    changed('removed-confirmation.input','failed operation cannot confirm removal',lambda d:d['entry']['operation'].update(outcome='failed'))
    changed('removed-confirmation.input','present path prevents confirmed declaration',lambda d:d['entry']['postRemovalReadback']['members'][0].update(filesystem='present'))
    changed('removed-confirmation.input','inaccessible parent cannot be unambiguous absence',lambda d:d['entry']['postRemovalReadback']['members'][0].update(containingLocationAccessible=False))
    changed('removed-confirmation.input','worktree registration check cannot be inapplicable',lambda d:d['entry']['postRemovalReadback']['members'][0].update(registration='not-applicable'))
    changed('removed-confirmation.input','required external evidence must be read after removal',lambda d:d['entry']['postRemovalReadback'].update(evidenceReadbackReference=None))
    changed('removed-confirmation.stored','stored removal requires writer confirmation',lambda d:d.update(confirmationObservation=None))
    changed('held.stored','stored resource ID cannot be null',lambda d:d['entry'].update(resourceId=None))
    changed('held.stored','stored record timestamp requires timezone',lambda d:d.update(recordedAt='2026-09-10T12:00:00'))
    # Deliberately valid structural inputs that still demand runtime/human checks.
    d=copy.deepcopy(examples['eligible-assessment.input']);d['entry']['preservation'].update(locationReference='unverified:nonexistent-copy',readbackReference='unverified:nonexistent-readback');check('schema cannot authenticate preservation references',d,True,'explicit-schema-limit')
    d=copy.deepcopy(examples['held.stored']);d['entry']['supersedes']=[d['recordId']];check('schema cannot validate supersession graph',d,True,'explicit-schema-limit')
    d=copy.deepcopy(examples['removed-confirmation.stored']);d['confirmationObservation']['members'][0]['path']='C:/fixture/different-resource';check('schema cannot bind observed members to resource paths',d,True,'explicit-schema-limit')
    d=copy.deepcopy(examples['eligible-assessment.input']);d['entry']['owner']=None;d['entry']['disposalAuthorityReference']='fixture-decision:explicit-exact-disposal';check('declared explicit disposal authority with unknown originating owner',d,True,'structural-contract-not-authorization')

    sources=[]
    for name in ['sdlc-implementation-plan-2026-09-10.md','sdlcworktreelifecyclehandoff20260910.md','wp0-worktree-preservation-implementation-plan-2026-09-10.md','wp1-text-boundaries-evidence-retention-implementation-plan-2026-09-10.md','wp2-independent-worktree-execution-implementation-plan-2026-09-10.md','wp2-policy-amendments.proposed.md']:
        if args.source_directory is not None:
            path=args.source_directory/name
            if path.is_file():
                b=path.read_bytes();sources.append({'file':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    artifacts=[]
    for path in sorted(root.rglob('*')):
        if path.is_file() and path.suffix in {'.md','.json','.py'} and path.resolve()!=args.output.resolve() and path.name!='SHA256SUMS':
            b=path.read_bytes();artifacts.append({'file':path.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    result={'recordType':'wp3-proposal-mechanical-checks','recordedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'environment':{'system':platform.system(),'platform':platform.platform(),'python':sys.version,'jsonschema':importlib.metadata.version('jsonschema')},'executed':['Draft202012Validator.check_schema against proposed schema','Validation of eight synthetic input/stored examples','Independent malformed variants and explicit demonstrations of schema limits','SHA-256 identity of named local source and proposal files'],'notExecuted':['The proposed record-resource-disposition CLI or new status view','Repository test catalogue T301-T336','Operational observations O31/O32','Windows, NTFS, PowerShell, Codex or DCG qualification','Worktree preservation, removal, operator notification or GitHub writes','Supersession graph, native inventory, path containment or live removal readback implementation'],'schemaValidated':True,'scenarioCount':len(cases),'matchingExpectations':sum(x['matchedExpectation'] for x in cases),'scenarios':cases,'sourceDocuments':sources,'artifactIdentities':artifacts}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'scenarioCount':result['scenarioCount'],'matchingExpectations':result['matchingExpectations'],'output':str(args.output)}))
    return 0 if all(x['matchedExpectation'] for x in cases) else 1
if __name__=='__main__':raise SystemExit(main())
