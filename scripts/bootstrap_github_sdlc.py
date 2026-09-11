#!/usr/bin/env python3
"""Install SDLC labels or explicitly check the read-only Issue prerequisite."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _commands import SetupError, require_command, run
from _repository import derive_repo_from_script

LABELS = [
    ('sdlc:change', '0969da', 'A proposed capability/change dossier'),
    ('sdlc:bug', 'd73a4a', 'An observed defect/failure dossier'),
    ('state:draft', 'd4c5f9', 'Intent or defect is being clarified'),
    ('state:ready-to-baseline', 'fbca04', 'Normative body is ready for accountable baseline review'),
    ('state:accepted', '0e8a16', 'Current Issue body matches an accepted Git baseline'),
    ('state:changed', 'b60205', 'Normative content changed after acceptance'),
    ('state:implementing', '1d76db', 'Accepted change is being implemented'),
    ('state:verified', '5319e7', 'Implementation has current verification/review evidence'),
    ('state:released', '0052cc', 'Change has been released but outcome is not yet validated'),
    ('state:validated', '006b75', 'Production behaviour and intended outcome were reviewed'),
    ('risk:R0', 'c2e0c6', 'Trivial/highly reversible change'),
    ('risk:R1', '7fd4f2', 'Ordinary bounded engineering change'),
    ('risk:R2', 'f9d0c4', 'Elevated data/security/contract/operational risk'),
    ('risk:R3', 'b60205', 'High-assurance safety/legal/financial/critical risk'),
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-issue-readiness', action='store_true',
                        help='Check whether Issues is enabled without installing labels or changing settings.')
    args = parser.parse_args()
    try:
        repo = derive_repo_from_script(__file__)
        gh = require_command('gh')
        if args.check_issue_readiness:
            result = run((gh, 'repo', 'view', '--json', 'nameWithOwner,hasIssuesEnabled'),
                         cwd=repo, capture=True, encoding='utf-8', errors='strict')
            metadata = json.loads(result.stdout)
            if (not isinstance(metadata, dict)
                    or not isinstance(metadata.get('nameWithOwner'), str)
                    or not metadata['nameWithOwner'].strip()
                    or type(metadata.get('hasIssuesEnabled')) is not bool):
                raise SetupError('GitHub Issue availability was not returned as valid repository metadata.')
            if not metadata['hasIssuesEnabled']:
                raise SetupError('Issues is disabled. Issue-based readiness is blocked; obtain explicit '
                                 'owner approval for has_issues=true before changing that setting.')
            print('Issues is enabled. Baseline linkage, permissions and required-check enforcement are not verified.')
            return 0
        for name, color, description in LABELS:
            run((gh, 'label', 'create', name, '--color', color, '--description', description, '--force'), cwd=repo)
        print(f'Created or updated {len(LABELS)} SDLC labels.')
        return 0
    except (SetupError, subprocess.CalledProcessError, OSError, ValueError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
