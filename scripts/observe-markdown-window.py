"""Observe six full trusted checks; this records budgets, not OS limits."""

# SPDX-License-Identifier: AGPL-3.0-only
import ctypes
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def host_git():
    executable = shutil.which("git")
    if executable is None:
        raise RuntimeError("Host Git is unavailable")
    bound = Path(executable).resolve(strict=True)
    if not bound.is_file() or (
        sys.platform == "win32" and bound.suffix.lower() != ".exe"
    ):
        raise RuntimeError("Host Git must be a native executable")
    return bound


def linux_members(group, proc_root=Path("/proc")):
    members = []
    for directory in proc_root.iterdir():
        if not directory.name.isdecimal():
            continue
        try:
            text = (directory / "stat").read_text()
            fields = text[text.rindex(")") + 2 :].split()
            if int(fields[2]) == group and fields[0] != "Z":
                members.append((directory, fields[19]))
        except FileNotFoundError, ProcessLookupError:
            continue
    return members


def linux_rss(group, proc_root=Path("/proc")):
    total = 0
    count = 0
    for directory, birth in linux_members(group, proc_root):
        try:
            lines = (directory / "smaps_rollup").read_text().splitlines()
            text = (directory / "stat").read_text()
            fields = text[text.rindex(")") + 2 :].split()
            if fields[19] != birth or int(fields[2]) != group:
                continue
            if fields[0] == "Z":
                continue
            rss = next(line for line in lines if line.startswith("Rss:"))
            total += int(rss.split()[1]) * 1024
            count += 1
        except FileNotFoundError, ProcessLookupError:
            continue
    return total, count


def cleanup_linux(child):
    """Kill only the owned, still-live session; preserve uncertain cleanup evidence."""
    try:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGKILL)
        child.wait(timeout=5)
        return "quiescent" if not linux_members(child.pid) else "not-quiescent"
    except (OSError, subprocess.TimeoutExpired) as error:
        # If /proc is unreadable but the owned leader is alive, its unreaped PID
        # still identifies our process group. Never signal an unknown dead group.
        if child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait(timeout=5)
            except OSError, subprocess.TimeoutExpired:
                pass
        return f"unknown: {type(error).__name__}"


def windows_job():
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.AssignProcessToJobObject.argtypes = [
        wintypes.HANDLE,
        wintypes.HANDLE,
    ]
    kernel.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel.QueryInformationJobObject.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        ctypes.c_void_p,
        wintypes.DWORD,
        ctypes.c_void_p,
    ]
    kernel.QueryInformationJobObject.restype = wintypes.BOOL
    kernel.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.TerminateJobObject.restype = wintypes.BOOL

    class Basic(ctypes.Structure):
        _fields_ = [
            ("process_time", ctypes.c_int64),
            ("job_time", ctypes.c_int64),
            ("flags", wintypes.DWORD),
            ("working_min", ctypes.c_size_t),
            ("working_max", ctypes.c_size_t),
            ("active_limit", wintypes.DWORD),
            ("affinity", ctypes.c_size_t),
            ("priority", wintypes.DWORD),
            ("scheduling", wintypes.DWORD),
        ]

    class Io(ctypes.Structure):
        _fields_ = [
            (name, ctypes.c_uint64)
            for name in [
                "read_ops",
                "write_ops",
                "other_ops",
                "read_bytes",
                "write_bytes",
                "other_bytes",
            ]
        ]

    class Limits(ctypes.Structure):
        _fields_ = [
            ("basic", Basic),
            ("io", Io),
            ("process_limit", ctypes.c_size_t),
            ("job_limit", ctypes.c_size_t),
            ("peak_process", ctypes.c_size_t),
            ("peak_job", ctypes.c_size_t),
        ]

    class Accounting(ctypes.Structure):
        _fields_ = [
            ("user", ctypes.c_int64),
            ("kernel", ctypes.c_int64),
            ("period_user", ctypes.c_int64),
            ("period_kernel", ctypes.c_int64),
            ("faults", wintypes.DWORD),
            ("processes", wintypes.DWORD),
            ("active", wintypes.DWORD),
            ("terminated", wintypes.DWORD),
        ]

    job = kernel.CreateJobObjectW(None, None)
    if not job or not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        raise ctypes.WinError(ctypes.get_last_error())

    def observe():
        limits = Limits()
        accounting = Accounting()
        for number, record in [(9, limits), (1, accounting)]:
            if not kernel.QueryInformationJobObject(
                job, number, ctypes.byref(record), ctypes.sizeof(record), None
            ):
                raise ctypes.WinError(ctypes.get_last_error())
        return limits.peak_job, accounting.active - 1, accounting.processes - 1

    # The driver remains in the job. No memory or kill-on-close limits are set.
    def abort():
        # Failure evidence is written before this kills the driver and children.
        if not kernel.TerminateJobObject(job, 2):
            raise ctypes.WinError(ctypes.get_last_error())

    return observe, abort


def run_window():
    trusted = Path(__file__).resolve().parent.parent
    script = trusted / "scripts/check-markdown-candidate.mjs"
    node = Path(os.environ["MARKDOWN_WINDOW_NODE"]).resolve(strict=True)
    scratch = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
    output = scratch / "markdown-window"
    output.mkdir(exist_ok=False)
    windows = sys.platform == "win32"
    if not windows and sys.platform != "linux":
        raise RuntimeError("Only qualified Windows/Linux hosts are supported")
    observe, abort_job = windows_job() if windows else (None, None)
    samples = []
    common = None
    passed = False
    failure = None
    child = None
    abort_required = False
    cleanup = None
    git = None
    try:
        git = host_git()
        for index in range(1, 7):
            sample = output / f"sample-{index}"
            sample.mkdir()
            env = {
                name: os.environ[name]
                for name in [
                    "SystemRoot",
                    "SYSTEMROOT",
                    "WINDIR",
                    "TEMP",
                    "TMP",
                    "MARKDOWN_CANDIDATE_REPOSITORY",
                    "MARKDOWN_CANDIDATE_SHA",
                    "MARKDOWN_TRUSTED_SHA",
                    "GITHUB_REPOSITORY",
                    "GITHUB_WORKFLOW_REF",
                    "GITHUB_RUN_ID",
                    "GITHUB_RUN_ATTEMPT",
                    "GITHUB_JOB",
                    "GITHUB_EVENT_NAME",
                    "GITHUB_ACTOR",
                    "ImageOS",
                    "ImageVersion",
                ]
                if name in os.environ
            }
            env["RUNNER_TEMP"] = str(sample)
            env["MARKDOWN_WINDOW_GIT"] = str(git)
            peak = 0
            polls = 0
            max_members = 0
            started = time.monotonic()
            with (
                (sample / "stdout.txt").open("wb") as stdout,
                (sample / "stderr.txt").open("wb") as stderr,
            ):
                child = subprocess.Popen(
                    [str(node), str(script)],
                    cwd=trusted,
                    env=env,
                    stdout=stdout,
                    stderr=stderr,
                    start_new_session=not windows,
                )
                while child.poll() is None:
                    if not windows:
                        rss, members = linux_rss(child.pid)
                        peak = max(peak, rss)
                        max_members = max(max_members, members)
                        polls += 1
                    if time.monotonic() - started > 120:
                        if not windows:
                            os.killpg(child.pid, signal.SIGKILL)
                            child.wait(timeout=5)
                        raise TimeoutError("Full trusted check exceeded 120s")
                    time.sleep(0.05)
                elapsed = round((time.monotonic() - started) * 1000)
            if windows:
                peak, active, processes = observe()
                if active != 0:
                    raise RuntimeError("Job descendants did not quiesce")
            else:
                if linux_members(child.pid):
                    raise RuntimeError("Process group did not quiesce")
                processes = None
                if polls == 0 or peak == 0:
                    raise RuntimeError("No valid process-tree RSS observation")
            receipt_path = sample / "markdown-evidence/trusted-markdown-run.json"
            if receipt_path.stat().st_size > 8_000_000:
                raise RuntimeError("Oversized trusted receipt")
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            identity = {
                key: receipt[key]
                for key in [
                    "candidate",
                    "trusted",
                    "staging",
                    "suppliedEnvironmentNames",
                    "host",
                    "workflow",
                    "result",
                ]
            }
            if common is not None and identity != common:
                raise RuntimeError("Frozen inputs or full results changed")
            common = identity
            samples.append(
                {
                    "index": index,
                    "receiptSha256": sha(receipt_path),
                    "checkerElapsedMs": receipt["checkerElapsedMs"],
                    "outerElapsedMsIncludingStaging": elapsed,
                    "peakObservedBytes": peak,
                    "exitCode": child.returncode,
                    "activeDescendants": 0,
                    "samplePolls": polls if not windows else None,
                    "maximumObservedGroupMembers": max_members if not windows else None,
                    "totalJobDescendantsAcrossWindow": processes,
                }
            )
            if (
                child.returncode != 0
                or receipt["result"]["exitCode"] != 0
                or receipt["result"]["diagnostics"]
                or receipt["result"]["errors"]
                or receipt["result"]["written"]
                or receipt["checkerElapsedMs"] > 30_000
                or peak > 1024 * 1024 * 1024
            ):
                raise RuntimeError("Correctness, timing or memory budget failed")
        passed = True
    except Exception as error:
        failure = f"{type(error).__name__}: {error}"
        if windows:
            try:
                abort_required = observe()[1] != 0
                cleanup = "pending-job-abort" if abort_required else "quiescent"
            except OSError:
                abort_required = True
                cleanup = "unknown: job observation failed"
        elif child is not None:
            cleanup = cleanup_linux(child)
    report = {
        "schemaVersion": 1,
        "passed": passed,
        "failure": failure,
        "failureCleanup": cleanup,
        "requiredConsecutiveSamples": 6,
        "samples": samples,
        "observedNearestRankP95Ms": max(
            (sample["checkerElapsedMs"] for sample in samples), default=None
        )
        if len(samples) == 6
        else None,
        "memoryMetric": (
            "Windows Job peak committed bytes, including Python driver; "
            "cumulative peak across this six-check window"
            if windows
            else "Sampled sum of smaps_rollup RSS for the dedicated process group; "
            "shared pages counted per process; excludes Python observer"
        ),
        "memoryLimitBytes": 1024 * 1024 * 1024,
        "latencyLimitMs": 30_000,
        "limitations": (
            "Observed six-sample window, not a statistical tail or OS limit. "
            "Linux sampling has at least 50ms plus scan overhead between polls; "
            "short-lived peaks can occur between samples. The qualified checker "
            "and native subprocesses do not escape the dedicated process group. "
            "Independent finding adjudication and owner hosted-run acceptance "
            "remain separate."
        ),
        "identity": common,
        "observerSha256": sha(Path(__file__)),
        "nodeExecutable": str(node),
        "metadataGitExecutable": str(git) if git else None,
        "python": sys.version,
    }
    (output / "window.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                key: report[key]
                for key in [
                    "passed",
                    "failure",
                    "observedNearestRankP95Ms",
                    "memoryMetric",
                ]
            }
        ),
        flush=True,
    )
    if abort_required:
        abort_job()
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(run_window())
