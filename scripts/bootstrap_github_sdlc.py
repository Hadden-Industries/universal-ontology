#!/usr/bin/env python3
"""Create/update the portable GitHub labels used by the SDLC scaffold."""

from __future__ import annotations

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
    try:
        repo = derive_repo_from_script(__file__)
        gh = require_command('gh')
        for name, color, description in LABELS:
            run((gh, 'label', 'create', name, '--color', color, '--description', description, '--force'), cwd=repo)
        print(f'Created or updated {len(LABELS)} SDLC labels.')
        return 0
    except (SetupError, subprocess.CalledProcessError, OSError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
