"""Finite byte-producing process used by verification retention tests."""
import argparse
import sys
import os
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--hex', default='e29c9620e6bca2e5ad9720f09f98800a')
parser.add_argument('--exit-code', type=int, default=0)
parser.add_argument('--ready', type=Path)
parser.add_argument('--release', type=Path)
parser.add_argument('--wait-seconds', type=float, default=30)
args = parser.parse_args()
sys.stdout.buffer.write(bytes.fromhex(args.hex))
sys.stdout.buffer.flush()
if args.ready:
    args.ready.write_text(str(os.getpid()), encoding='ascii')
if args.release:
    deadline = time.monotonic() + args.wait_seconds
    while not args.release.exists():
        if time.monotonic() >= deadline:
            raise SystemExit(98)
        time.sleep(0.01)
raise SystemExit(args.exit_code)
