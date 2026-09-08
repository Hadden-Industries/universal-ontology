#!/usr/bin/env python3
"""Check current route-selected evidence without trapping a blocked task in a loop."""
from __future__ import annotations
import json
import sys
from contextlib import redirect_stdout
from _repository import derive_repo_from_script
from _sdlc_state import ACTIVE_TASK_PATH, required_verification_gaps, load_json

def main() -> int:
    """Check local evidence. Reserve stdout for hook JSON; after one continuation allow an honest blocker report rather than an endless loop. This does not authorise completion."""
    try:
        payload = json.loads(sys.stdin.read() or '{}')
        with redirect_stdout(sys.stderr):
            repo = derive_repo_from_script(__file__)
        if not (repo / ACTIVE_TASK_PATH).is_file():
            print('{}')
            return 0
        active = load_json(repo / ACTIVE_TASK_PATH)
        if active.get('paused'):
            print(json.dumps({'systemMessage': 'SDLC task remains paused/incomplete. Do not claim completion.'}))
            return 0
        gaps = required_verification_gaps(repo)
        if not gaps:
            print('{}')
            return 0
        message = 'SDLC evidence incomplete: ' + '; '.join(gaps)
    except Exception as exc:
        message = f'SDLC gate could not establish evidence: {exc}'
    if isinstance(locals().get('payload'), dict) and payload.get('stop_hook_active'):
        print(json.dumps({'systemMessage': message + ' Report the blocker; no completion is authorised.'}))
        return 0
    print(message + ' Run the selected checks or record an honest blocker with authorised pause.', file=sys.stderr)
    return 2
if __name__ == '__main__':
    raise SystemExit(main())
