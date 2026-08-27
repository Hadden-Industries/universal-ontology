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


if __name__ == "__main__":
    unittest.main()
