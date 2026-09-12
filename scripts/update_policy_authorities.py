#!/usr/bin/env python3
"""Derive or check the pinned authority snapshots under policy/authorities/.

Explicit maintenance command; nothing schedules it. It never fetches over the
network: supply the raw payloads you retrieved (and reviewed for rights) with
``--raw <name>=<path>``. Exit status: 0 derived/reconciled; 1 a snapshot does
not reconcile; 2 usage or payload error.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ontology_policy.authorities import (  # noqa: E402
    AUTHORITIES_DIRECTORY,
    AUTHORITY_SPECIFICATIONS,
    AuthorityError,
    derive_snapshot,
    reconcile_snapshot,
)


def parse_raw(values):
    raw = {}
    for item in values or ():
        name, _, path = item.partition("=")
        if name not in AUTHORITY_SPECIFICATIONS or not path:
            raise SystemExit(f"--raw expects <name>=<path> with name in {sorted(AUTHORITY_SPECIFICATIONS)}; got {item!r}")
        raw[name] = Path(path)
    return raw


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Derive or check authority membership snapshots.")
    parser.add_argument("--raw", action="append", metavar="NAME=PATH", help="Raw payload retrieved for the named authority")
    parser.add_argument("--directory", type=Path, default=AUTHORITIES_DIRECTORY, help="Snapshot directory")
    parser.add_argument("--check", action="store_true", help="Reconcile stored snapshots against the raw payloads; write nothing")
    parser.add_argument("--retrieved-on", help="Retrieval date (YYYY-MM-DD) of the raw payloads")
    parser.add_argument("--licence", action="append", metavar="NAME=TEXT", help="Exact licence/NOTICE reference per authority")
    parser.add_argument("--rights-decision", action="append", metavar="NAME=REFERENCE", help="Owner rights decision reference per authority")
    args = parser.parse_args(argv)
    try:
        raw_paths = parse_raw(args.raw)
    except SystemExit as error:
        print(error, file=sys.stderr)
        return 2
    if not raw_paths:
        print("Supply at least one --raw <name>=<path>.", file=sys.stderr)
        return 2
    status = 0
    for name, path in raw_paths.items():
        raw = path.read_bytes()
        try:
            if args.check:
                problems = reconcile_snapshot(name, raw, args.directory)
                if problems:
                    status = 1
                    for problem in problems:
                        print(problem, file=sys.stderr)
                else:
                    print(f"{name}: snapshot reconciles with {path}.")
                continue
            per = lambda values: dict(item.partition("=")[::2] for item in values or ())  # noqa: E731
            licences, decisions = per(args.licence), per(args.rights_decision)
            if not args.retrieved_on or name not in licences or name not in decisions:
                print(f"{name}: --retrieved-on, --licence {name}=... and --rights-decision {name}=... are required to derive.", file=sys.stderr)
                return 2
            snapshot = derive_snapshot(name, raw, args.directory, {"retrievedOn": args.retrieved_on, "licence": licences[name], "rightsDecision": decisions[name]})
            print(f"{name}: {snapshot.member_count} members, derived sha256 {snapshot.derived_sha256}")
        except AuthorityError as error:
            print(f"AUTHORITY_ERROR: {error}", file=sys.stderr)
            return 2
    return status


if __name__ == "__main__":
    sys.exit(main())
