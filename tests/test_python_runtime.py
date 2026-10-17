"""Tests for this repository's stable Python runtime policy."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "scripts"))
try:
    import _commands as runtime
finally:
    sys.path.pop(0)


class PythonVersionTests(unittest.TestCase):
    target = tuple(
        int(part)
        for part in (Path(__file__).resolve().parents[1] / ".python-version")
        .read_text(encoding="utf-8")
        .strip()
        .split(".")
    )

    def test_rejects_python_below_repository_minimum(self):
        below = (self.target[0], self.target[1] - 1, 99)
        with mock.patch.object(runtime.sys, "version_info", below):
            with self.assertRaisesRegex(runtime.SetupError, "Stable Python"):
                runtime.require_python_version()

    def test_accepts_python_at_or_above_repository_minimum(self):
        for version in (self.target, (*self.target[:2], self.target[2] + 1)):
            with self.subTest(version=version):
                with mock.patch.object(runtime.sys, "version_info", version):
                    runtime.require_python_version()

    def test_changed_repository_pin_is_consumed_and_prereleases_are_rejected(self):
        class Prerelease(tuple):
            releaselevel = "candidate"

        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            (repo / ".python-version").write_text("3.16.2\n", encoding="utf-8")
            with mock.patch.object(
                runtime, "__file__", str(repo / "scripts" / "_commands.py")
            ):
                for version in ((3, 16, 1), Prerelease((3, 16, 2))):
                    with mock.patch.object(runtime.sys, "version_info", version):
                        with self.assertRaises(runtime.SetupError):
                            runtime.require_python_version()
                with mock.patch.object(runtime.sys, "version_info", (3, 16, 2)):
                    runtime.require_python_version()


if __name__ == "__main__":
    unittest.main()
