import sys
import unittest
from pathlib import Path


SCRIPTS_DIRECTORY = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIRECTORY))

import upload_to_s3  # noqa: E402


class UploadToS3CommandTests(unittest.TestCase):
    def setUp(self):
        self.upload_script = Path("C:/example/amazon-aws/upload_to_s3.py")
        self.local_directory = Path("C:/example/universal-ontology/dist")
        self.expected_command = [
            sys.executable,
            str(self.upload_script),
            str(self.local_directory),
            "--region",
            "eu-west-1",
            "--bucket",
            "haddenindustries-com-static-assets",
            "--prefix",
            "ontology",
            "--exclude",
            "external/*.url",
            "--invalidate-cloudfront",
            "--delete",
        ]

    def test_default_upload_uses_the_helper_default_comparison_mode(self):
        command = upload_to_s3.build_upload_command(
            self.upload_script,
            self.local_directory,
            force=False,
        )

        self.assertEqual(command, self.expected_command)

    def test_forced_upload_selects_the_helpers_force_comparison_mode(self):
        command = upload_to_s3.build_upload_command(
            self.upload_script,
            self.local_directory,
            force=True,
        )

        self.assertEqual(
            command,
            [*self.expected_command, "--compare-mode", "force"],
        )

    def test_force_flag_is_opt_in(self):
        self.assertFalse(upload_to_s3.parse_args([]).force)
        self.assertTrue(upload_to_s3.parse_args(["--force"]).force)

    def test_helper_runs_under_its_own_repository_venv_when_present(self):
        """awscrt lives in the amazon-aws venv, not in this repository's hash-locked environment."""
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            helper = Path(temporary) / "amazon-aws" / "scripts" / "upload_to_s3.py"
            helper.parent.mkdir(parents=True)
            helper.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.helper_interpreter(helper), sys.executable)
            venv_python = Path(temporary) / "amazon-aws" / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
            venv_python.parent.mkdir(parents=True)
            venv_python.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.helper_interpreter(helper), str(venv_python))
            command = upload_to_s3.build_upload_command(helper, self.local_directory, force=False, interpreter=str(venv_python))
            self.assertEqual(command[0], str(venv_python))

    def test_helper_is_found_beside_the_main_repository_from_a_linked_worktree(self):
        """A linked worktree elsewhere on disk still resolves the helper beside the main checkout."""
        import subprocess
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            main_repository = root / "main-checkout" / "universal-ontology"
            main_repository.mkdir(parents=True)
            subprocess.run(["git", "init", "-q", "--initial-branch=main", str(main_repository)], check=True)
            subprocess.run(["git", "-C", str(main_repository), "-c", "user.name=t", "-c", "user.email=t@example.invalid",
                            "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", "root"], check=True)
            helper = root / "main-checkout" / "amazon-aws" / "scripts" / "upload_to_s3.py"
            helper.parent.mkdir(parents=True)
            helper.write_text("", encoding="utf-8")
            worktree = root / "worktrees" / "feature"
            subprocess.run(["git", "-C", str(main_repository), "worktree", "add", "-q", "--detach", str(worktree)], check=True)
            self.assertEqual(upload_to_s3.locate_helper_script(worktree), helper)
            # Beside the checkout itself still wins when present.
            sibling = root / "worktrees" / "amazon-aws" / "scripts" / "upload_to_s3.py"
            sibling.parent.mkdir(parents=True)
            sibling.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.locate_helper_script(worktree), sibling)
            subprocess.run(["git", "-C", str(main_repository), "worktree", "remove", "--force", str(worktree)], check=True)


if __name__ == "__main__":
    unittest.main()


class PublicationGateIntegrationTests(unittest.TestCase):
    """The uploader consults the publication gate before running the external helper."""

    def test_main_refuses_to_upload_when_the_gate_refuses(self):
        import tempfile
        from unittest import mock

        from ontology_policy.publication import PublicationRefusal

        with tempfile.TemporaryDirectory() as temporary:
            helper = Path(temporary) / "amazon-aws" / "scripts" / "upload_to_s3.py"
            helper.parent.mkdir(parents=True)
            helper.write_text("print('should not run')", encoding="utf-8")
            with mock.patch.object(upload_to_s3, "check_repository_publication", side_effect=PublicationRefusal("stale receipt")), \
                 mock.patch.object(upload_to_s3.subprocess, "run") as run, \
                 mock.patch.object(upload_to_s3, "HELPER_SCRIPT_PATH", helper):
                with self.assertRaises(SystemExit) as stop:
                    upload_to_s3.main([])
                self.assertEqual(stop.exception.code, 2)
                run.assert_not_called()

    def test_main_runs_the_helper_only_after_the_gate_passes(self):
        import tempfile
        from unittest import mock

        from ontology_policy.publication import GateVerdict

        with tempfile.TemporaryDirectory() as temporary:
            helper = Path(temporary) / "amazon-aws" / "scripts" / "upload_to_s3.py"
            helper.parent.mkdir(parents=True)
            helper.write_text("", encoding="utf-8")
            verdict = GateVerdict("latest-active", ("src/universal/core/20260714",), "sha256:policy")
            with mock.patch.object(upload_to_s3, "check_repository_publication", return_value=verdict), \
                 mock.patch.object(upload_to_s3.subprocess, "run") as run, \
                 mock.patch.object(upload_to_s3, "HELPER_SCRIPT_PATH", helper):
                upload_to_s3.main([])
                run.assert_called_once()
                self.assertEqual(run.call_args.args[0][1], str(helper))
