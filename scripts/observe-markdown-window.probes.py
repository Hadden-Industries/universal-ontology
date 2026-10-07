"""Independent process-observation boundary probes; no pilot acceptance claims."""

# SPDX-License-Identifier: AGPL-3.0-only
import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "observer", Path(__file__).with_name("observe-markdown-window.py")
)
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)


def process(root, pid, group, rss, birth="123", state="S"):
    directory = root / str(pid)
    directory.mkdir()
    fields = [state, "1", str(group)] + ["0"] * 16 + [birth]
    (directory / "stat").write_text(
        f"{pid} (native (name) with spaces) " + " ".join(fields)
    )
    (directory / "smaps_rollup").write_text(f"Rss: {rss} kB\nPss: 1 kB\n")
    return directory


class ProcessGroupObservation(unittest.TestCase):
    def test_bound_host_git_executes_without_path_or_credentials(self):
        executable = observer.host_git()
        env = {
            name: os.environ[name]
            for name in ["SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
            if name in os.environ
        }
        result = subprocess.run(
            [str(executable), "--version"],
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.startswith("git version "))

    def test_sums_all_group_processes_excludes_other_groups_and_zombies(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            process(root, 11, 7, 123)
            process(root, 12, 7, 456)
            process(root, 13, 8, 9999)
            process(root, 14, 7, 9999, state="Z")
            self.assertEqual(observer.linux_rss(7, root), (579 * 1024, 2))

    def test_reused_pid_cannot_add_memory_to_the_original_group(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = process(root, 11, 7, 9999, birth="456")
            with patch.object(
                observer, "linux_members", return_value=[(directory, "123")]
            ):
                self.assertEqual(observer.linux_rss(7, root), (0, 0))

    def test_disappearing_process_is_a_race_not_a_zero_sample_claim(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary) / "gone"
            with patch.object(
                observer, "linux_members", return_value=[(directory, "123")]
            ):
                self.assertEqual(observer.linux_rss(7), (0, 0))

    def test_denied_observation_fails_closed(self):
        with patch.object(observer, "linux_members", side_effect=PermissionError):
            with self.assertRaises(PermissionError):
                observer.linux_rss(7)

    def test_denied_cleanup_is_retained_as_unknown_without_signalling_dead_pid(
        self,
    ):
        child = Mock(pid=7)
        child.poll.return_value = 0
        with (
            patch.object(observer, "linux_members", side_effect=PermissionError),
            patch.object(observer.os, "killpg", create=True) as kill,
        ):
            self.assertEqual(observer.cleanup_linux(child), "unknown: PermissionError")
            kill.assert_not_called()

    def test_denied_cleanup_can_stop_the_owned_live_leader(self):
        child = Mock(pid=7)
        child.poll.side_effect = [None, 0]
        with (
            patch.object(observer, "linux_members", side_effect=PermissionError),
            patch.object(observer.os, "killpg", create=True) as kill,
            patch.object(observer.signal, "SIGKILL", 9, create=True),
        ):
            self.assertEqual(observer.cleanup_linux(child), "unknown: PermissionError")
            kill.assert_called_once_with(7, observer.signal.SIGKILL)


if __name__ == "__main__":
    unittest.main()
