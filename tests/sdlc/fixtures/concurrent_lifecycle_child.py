"""Schedule the real lifecycle CLI at observable boundaries in fixture processes."""
import sys
from pathlib import Path
from unittest.mock import patch

mode, root, *arguments = sys.argv[1:]
sys.path.insert(0, str(Path(root) / 'scripts'))
import sdlc
import _sdlc_state as state


def barrier():
    print('READY', flush=True)
    if sys.stdin.readline().strip() != 'release':
        raise RuntimeError('Fixture publication barrier was not released')


sys.argv = [str(Path(root) / 'scripts/sdlc.py'), *arguments]
if mode == 'validated':
    original = sdlc.load_verification_controls

    def validated(repo):
        controls = original(repo)
        barrier()
        return controls

    with patch.object(sdlc, 'load_verification_controls', validated):
        raise SystemExit(sdlc.main())
elif mode in ('before-link', 'after-link'):
    original = state.os.link

    def observed_link(*args, **kwargs):
        if mode == 'before-link':
            barrier()
        result = original(*args, **kwargs)
        if mode == 'after-link':
            barrier()
        return result

    with patch.object(state.os, 'link', observed_link):
        raise SystemExit(sdlc.main())
else:
    raise ValueError('Unknown fixture observation boundary')
