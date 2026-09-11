#!/usr/bin/env python3
"""Bounded research probe for WP2, NOT the repository implementation or #33 acceptance.

Creates only new synthetic temporary files/repositories. No network access or
third-party packages. The intentionally unsafe check/replace variant is used
only inside the generated fixture to demonstrate its known interleaving.
Workspaces are retained for inspection; this program does not clean worktrees.
Run from an authorised environment after reviewing this file.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import queue
import subprocess
import sys
import tempfile
import threading
import time


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def document(name: str) -> bytes:
    # Deliberately a probe record, not an imitation of an accepted SDLC task.
    return (json.dumps({"probeTask": name, "purpose": "synthetic publication test"},
                       sort_keys=True, ensure_ascii=True) + "\n").encode("utf-8")


def candidate_file(directory: Path, name: str) -> Path:
    fd, name_on_disk = tempfile.mkstemp(prefix=f".active-{name}-", dir=directory)
    with os.fdopen(fd, "wb") as f:
        f.write(document(name))
        f.flush()
    return Path(name_on_disk)


def worker(directory: Path, name: str, variant: str, phase: str) -> int:
    active = directory / "active.json"
    # This preliminary check intentionally matches the old race opportunity.
    if os.path.lexists(active):
        print("OCCUPIED", file=sys.stderr)
        return 1
    candidate = candidate_file(directory, name)
    print(json.dumps({"event": "ready", "candidate": str(candidate)}), flush=True)
    if sys.stdin.readline().strip() != "go":
        return 2
    try:
        if variant == "check-replace":
            os.replace(candidate, active)
        else:
            os.link(candidate, active)
    except FileExistsError:
        winner = json.loads(active.read_bytes())
        print(json.dumps({"event": "rejected", "established": winner}), file=sys.stderr)
        return 1
    if phase == "after":
        print(json.dumps({"event": "published", "task": name}), flush=True)
        if sys.stdin.readline().strip() != "finish":
            return 2
    # Deliberately retain candidate aliases to inspect interruption semantics.
    print(json.dumps({"event": "success", "task": name}), flush=True)
    return 0


def receive_line(p: subprocess.Popen[str], timeout: float = 5) -> dict:
    q: queue.Queue[str] = queue.Queue()
    threading.Thread(target=lambda: q.put(p.stdout.readline()), daemon=True).start()
    line = q.get(timeout=timeout)
    if not line:
        raise RuntimeError("Process ended without the required readiness observation")
    return json.loads(line)


def spawn(directory: Path, name: str, variant: str = "exclusive-link",
          phase: str = "before") -> subprocess.Popen[str]:
    return subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "worker",
                             str(directory), name, variant, phase],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, encoding="utf-8")


def finish(p: subprocess.Popen[str], line: str = "go") -> dict:
    out, err = p.communicate(line + "\n", timeout=5)
    return {"returnCode": p.returncode, "stdout": out, "stderr": err}


def run_probe(output: Path) -> int:
    root = Path(tempfile.mkdtemp(prefix="wp2-mechanism-probe-"))
    observations: list[dict] = []
    processes: list[subprocess.Popen[str]] = []
    def record(name: str, expected: str, actual: dict, passed: bool) -> None:
        observations.append({"id": f"M{len(observations)+1:02}", "name": name,
                             "expected": expected, "actual": actual, "passed": passed})
        if not passed:
            raise AssertionError(name)
    def newdir(name: str) -> Path:
        d = root / name; d.mkdir(); return d
    try:
        for variant in ("check-replace", "exclusive-link"):
            d = newdir(variant)
            history = d / "retained-history.bin"
            history.write_bytes(b"earlier failed evidence\x00\xff")
            before = digest(history.read_bytes())
            ps = [spawn(d, name, variant) for name in ("alpha", "beta")]
            processes.extend(ps)
            ready = [receive_line(p) for p in ps]
            for p in ps:
                p.stdin.write("go\n"); p.stdin.flush()
            rs = []
            for p in ps:
                out, err = p.communicate(timeout=5)
                rs.append({"returnCode": p.returncode, "stdout": out, "stderr": err})
            winner = json.loads((d / "active.json").read_bytes())["probeTask"]
            codes = sorted(r["returnCode"] for r in rs)
            expected = [0, 0] if variant == "check-replace" else [0, 1]
            correct = codes == expected and digest(history.read_bytes()) == before
            if variant == "exclusive-link":
                accepted = [n for n, r in zip(("alpha", "beta"), rs) if r["returnCode"] == 0]
                rejected = [r for r in rs if r["returnCode"] == 1]
                correct &= accepted == [winner] and winner in rejected[0]["stderr"]
            record(variant, str(expected), {"ready": ready, "results": rs,
                   "activeTask": winner, "historySha256": before}, correct)
        for name, payload in (("valid", document("existing")), ("empty", b""),
                              ("malformed", b'{"broken":'),
                              ("paused", b'{"probeTask":"existing","paused":true}\n')):
            d = newdir("occupied-" + name)
            target = d / "active.json"; target.write_bytes(payload)
            candidate = candidate_file(d, "new")
            rejected = False
            try: os.link(candidate, target)
            except FileExistsError: rejected = True
            record("occupied-" + name, "reject; byte-identical target",
                   {"sha256": digest(target.read_bytes()), "rejected": rejected},
                   rejected and target.read_bytes() == payload)
        d = newdir("interrupted-before")
        p = spawn(d, "before"); processes.append(p)
        ready = receive_line(p); p.kill(); p.communicate(timeout=5)
        record("interrupted-before-publication", "no active ownership; candidate retained",
               {"returnCode": p.returncode, "ready": ready},
               not (d / "active.json").exists() and Path(ready["candidate"]).is_file())
        p = spawn(d, "replacement"); processes.append(p); receive_line(p); result = finish(p)
        record("new-explicit-request-after-prepublication-interruption", "new request may acquire",
               result, result["returnCode"] == 0)
        d = newdir("interrupted-after")
        p = spawn(d, "published", phase="after"); processes.append(p); ready = receive_line(p)
        p.stdin.write("go\n"); p.stdin.flush(); published = receive_line(p)
        p.kill(); p.communicate(timeout=5)
        active_bytes = (d / "active.json").read_bytes()
        candidate = candidate_file(d, "contender"); rejected = False
        try: os.link(candidate, d / "active.json")
        except FileExistsError: rejected = True
        record("interrupted-after-publication", "complete owner remains; later request rejected",
               {"ready": ready, "published": published, "rejected": rejected},
               rejected and active_bytes == document("published") and
               (d / "active.json").read_bytes() == active_bytes)
        d = newdir("alias-removal")
        candidate = candidate_file(d, "alias"); target = d / "active.json"
        os.link(candidate, target); same_before = os.path.samefile(candidate, target)
        candidate.unlink()
        record("unlink-only-private-alias", "active survives unchanged",
               {"sameFileBefore": same_before, "activeSha256": digest(target.read_bytes())},
               same_before and target.read_bytes() == document("alias"))
        d = newdir("later-replacement")
        candidate = candidate_file(d, "initial"); target = d / "active.json"; os.link(candidate, target)
        paused = candidate_file(d, "paused-state"); os.replace(paused, target)
        record("subsequent-atomic-update", "new active bytes; old alias unchanged",
               {"sameFileAfter": os.path.samefile(candidate, target)},
               not os.path.samefile(candidate, target) and
               candidate.read_bytes() == document("initial") and
               target.read_bytes() == document("paused-state"))
        d = newdir("occupied-directory"); (d / "active.json").mkdir()
        candidate = candidate_file(d, "candidate"); error = None
        try: os.link(candidate, d / "active.json")
        except OSError as e: error = type(e).__name__
        record("occupied-directory", "failure without replacement",
               {"exception": error}, error is not None and (d / "active.json").is_dir())
        d = newdir("occupied-symlink"); outside = d / "must-not-change.bin"; outside.write_bytes(b"untouched")
        target = d / "active.json"; target.symlink_to(outside)
        candidate = candidate_file(d, "candidate"); rejected = False
        try: os.link(candidate, target)
        except FileExistsError: rejected = True
        record("occupied-symlink", "reject; link and target unchanged",
               {"rejected": rejected}, rejected and target.is_symlink() and outside.read_bytes() == b"untouched")

        seed = newdir("seed"); env = os.environ.copy()
        # Scope Git's test configuration to this generated repository only.
        blank = root / "blank.gitconfig"; blank.write_bytes(b"")
        env.update(GIT_CONFIG_GLOBAL=str(blank), GIT_CONFIG_NOSYSTEM="1")
        def git(cwd: Path, *args: str) -> str:
            r = subprocess.run(["git", "-C", str(cwd), *args], env=env,
                               capture_output=True, text=True, encoding="utf-8", timeout=5)
            if r.returncode: raise RuntimeError(r.stderr)
            return r.stdout.strip()
        git(seed, "init", "-q")
        git(seed, "config", "user.name", "Synthetic WP2 probe")
        git(seed, "config", "user.email", "wp2@example.invalid")
        (seed / ".gitignore").write_text(".sdlc/runtime/\n", encoding="utf-8")
        (seed / "value.txt").write_text("fixture\n", encoding="utf-8")
        git(seed, "add", ".gitignore", "value.txt"); git(seed, "commit", "-qm", "Synthetic seed")
        a, b = root / "linked A", root / "linked B"
        git(seed, "worktree", "add", "-q", "-b", "probe-a", str(a), "HEAD")
        git(seed, "worktree", "add", "-q", "-b", "probe-b", str(b), "HEAD")
        common = [git(w, "rev-parse", "--path-format=absolute", "--git-common-dir") for w in (a, b)]
        gd = [git(w, "rev-parse", "--absolute-git-dir") for w in (a, b)]
        indices = [git(w, "rev-parse", "--path-format=absolute", "--git-path", "index") for w in (a, b)]
        ps = []
        for name, w in (("a", a), ("b", b)):
            d = w / ".sdlc/runtime"; d.mkdir(parents=True)
            p = spawn(d, name); processes.append(p); ps.append(p)
        ready = [receive_line(p) for p in ps]
        for p in ps: p.stdin.write("go\n"); p.stdin.flush()
        codes = []
        for p in ps: p.communicate(timeout=5); codes.append(p.returncode)
        record("real-linked-worktree-publication", "same common repo; distinct gitdirs/indexes; both independent publications pass",
               {"commonDirectories": common, "gitDirectories": gd, "indexPaths": indices, "returnCodes": codes},
               common[0] == common[1] and gd[0] != gd[1] and indices[0] != indices[1] and codes == [0, 0])
    except Exception as e:
        observations.append({"id": "PROBE_ERROR", "passed": False,
                             "error": type(e).__name__ + ": " + str(e)})
    finally:
        for p in processes:
            if p.poll() is None:
                p.kill(); p.communicate(timeout=5)
    payload = {"researchOnly": True, "executedAtUnixSeconds": time.time(),
               "platform": platform.platform(), "python": sys.version,
               "git": subprocess.run(["git", "--version"], capture_output=True, text=True).stdout.strip(),
               "workspace": str(root), "filesystemScope": "This run: Linux container overlay filesystem, not NTFS",
               "observations": observations,
               "passed": all(x["passed"] for x in observations),
               "limitations": ["Not the repository's sdlc.py or lifecycle regression suite",
                  "No Windows, NTFS, adopted Codex/DCG or power-loss qualification",
                  "Original variant is a transparent algorithmic reproduction, not a claimed operational incident",
                  "Linked-worktree test covers native Git topology and publication only, not begin/verify/pause/resume",
                  "Synthetic fixtures retained; no user checkout read or changed"]}
    if output.exists(): raise FileExistsError(output)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(observations)} observations; passed={payload['passed']}; {output}")
    return 0 if payload["passed"] else 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        raise SystemExit(worker(Path(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    raise SystemExit(run_probe(parser.parse_args().output))
