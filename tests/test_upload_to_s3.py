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
            # The helper resolves paths, which expands Windows 8.3 short names
            # such as RUNNER~1; expectations must use the same canonical form.
            root = Path(temporary).resolve()
            helper = root / "amazon-aws" / "scripts" / "upload_to_s3.py"
            helper.parent.mkdir(parents=True)
            helper.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.helper_interpreter(helper), sys.executable)
            venv_python = (
                root
                / "amazon-aws"
                / ".venv"
                / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
            )
            venv_python.parent.mkdir(parents=True)
            venv_python.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.helper_interpreter(helper), str(venv_python))
            command = upload_to_s3.build_upload_command(
                helper, self.local_directory, force=False, interpreter=str(venv_python)
            )
            self.assertEqual(command[0], str(venv_python))

    def test_helper_is_found_beside_the_main_repository_from_a_linked_worktree(self):
        """A linked worktree elsewhere on disk still resolves the helper beside the main checkout."""
        import subprocess
        import tempfile

        with tempfile.TemporaryDirectory() as temporary:
            # Git and the helper resolve paths, which expands Windows 8.3 short
            # names such as RUNNER~1; expectations must use the same canonical form.
            root = Path(temporary).resolve()
            main_repository = root / "main-checkout" / "universal-ontology"
            main_repository.mkdir(parents=True)
            subprocess.run(
                ["git", "init", "-q", "--initial-branch=main", str(main_repository)],
                check=True,
            )
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(main_repository),
                    "-c",
                    "user.name=t",
                    "-c",
                    "user.email=t@example.invalid",
                    "-c",
                    "commit.gpgsign=false",
                    "commit",
                    "-q",
                    "--allow-empty",
                    "-m",
                    "root",
                ],
                check=True,
            )
            helper = (
                root / "main-checkout" / "amazon-aws" / "scripts" / "upload_to_s3.py"
            )
            helper.parent.mkdir(parents=True)
            helper.write_text("", encoding="utf-8")
            worktree = root / "worktrees" / "feature"
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(main_repository),
                    "worktree",
                    "add",
                    "-q",
                    "--detach",
                    str(worktree),
                ],
                check=True,
            )
            self.assertEqual(upload_to_s3.locate_helper_script(worktree), helper)
            # Beside the checkout itself still wins when present.
            sibling = root / "worktrees" / "amazon-aws" / "scripts" / "upload_to_s3.py"
            sibling.parent.mkdir(parents=True)
            sibling.write_text("", encoding="utf-8")
            self.assertEqual(upload_to_s3.locate_helper_script(worktree), sibling)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(main_repository),
                    "worktree",
                    "remove",
                    "--force",
                    str(worktree),
                ],
                check=True,
            )


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
            with (
                mock.patch.object(
                    upload_to_s3,
                    "check_repository_publication",
                    side_effect=PublicationRefusal("stale receipt"),
                ),
                mock.patch.object(upload_to_s3.subprocess, "run") as run,
                mock.patch.object(upload_to_s3, "HELPER_SCRIPT_PATH", helper),
            ):
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
            verdict = GateVerdict(
                "latest-active", ("src/universal/core/20260714",), "sha256:policy"
            )
            with (
                mock.patch.object(
                    upload_to_s3, "check_repository_publication", return_value=verdict
                ),
                mock.patch.object(upload_to_s3.subprocess, "run") as run,
                mock.patch.object(upload_to_s3, "HELPER_SCRIPT_PATH", helper),
                mock.patch.object(
                    upload_to_s3,
                    "prepare_publication_candidate",
                    return_value=(
                        Path(temporary) / "candidate",
                        Path(temporary) / "candidate/dist",
                        {},
                    ),
                ),
                mock.patch.object(upload_to_s3.shutil, "rmtree"),
                mock.patch.object(upload_to_s3, "_tree_identity", return_value={}),
            ):
                upload_to_s3.main([])
                run.assert_called_once()
                self.assertEqual(run.call_args.args[0][1], str(helper))
                self.assertEqual(
                    run.call_args.args[0][2], str(Path(temporary) / "candidate/dist")
                )

    def test_snapshot_rejects_live_mutation_without_uploading(self):
        import tempfile
        from unittest import mock

        from ontology_policy.publication import PublicationRefusal

        with tempfile.TemporaryDirectory() as temporary:
            repository = Path(temporary)
            live = repository / "dist"
            live.mkdir()
            (live / "asset").write_text("original", encoding="utf-8")
            real_copy = upload_to_s3.shutil.copytree

            def mutate(source, destination):
                real_copy(source, destination)
                (live / "asset").write_text("changed", encoding="utf-8")

            with (
                mock.patch.object(upload_to_s3.shutil, "copytree", side_effect=mutate),
                mock.patch.object(upload_to_s3, "check_repository_publication") as gate,
            ):
                with self.assertRaisesRegex(PublicationRefusal, "changed"):
                    upload_to_s3.prepare_publication_candidate(repository)
                gate.assert_not_called()


class RealPublicationAdmissionTests(unittest.TestCase):
    """Exercise actual normal/force admission; only the AWS helper is replaced by a local observer."""

    def test_actual_upload_boundary_checks_full_outputs_and_uses_a_separate_snapshot(
        self,
    ):
        import hashlib
        import json
        import shutil
        import subprocess
        import tempfile
        from unittest import mock

        from ontology_policy import publication
        from ontology_policy.validation import required_authorities

        repository = SCRIPTS_DIRECTORY.parent
        temporary_parent = repository / ".sdlc/runtime"
        temporary_parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix="upload-contract-", dir=temporary_parent
        ) as temporary:
            root = Path(temporary).resolve()
            shutil.copytree(repository / "scripts", root / "scripts")
            (root / "src").mkdir()
            for path in (repository / "src").glob("*.js"):
                shutil.copyfile(path, root / "src" / path.name)
            (root / "docs/import-closure").mkdir(parents=True)
            shutil.copyfile(
                repository / "docs/import-closure/contract.v1.json",
                root / "docs/import-closure/contract.v1.json",
            )
            for name in ("package-lock.json", "requirements.lock.txt"):
                shutil.copyfile(repository / name, root / name)
            base = "https://haddenindustries.com/ontology/"
            modules = publication.load_owned_modules()
            dep = "iso/example/20260713"

            def source(path, imports=""):
                family = path.rsplit("/", 1)[0]
                return f'<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#"><owl:Ontology rdf:about="{base}{family}/"><owl:versionIRI rdf:resource="{base}{path}"/>{imports}</owl:Ontology><owl:Class rdf:about="{base}{path}#Class"/></rdf:RDF>'.encode()

            records = []
            for module in modules:
                locator = module.active_artifact_path
                if not locator:
                    continue
                path = locator.removeprefix("src/")
                imports = (
                    f'<owl:imports rdf:resource="{base}{dep}"/>'
                    if path.startswith("universal/core/")
                    else ""
                )
                data = source(path, imports)
                for destination in (root / locator, root / "dist" / path):
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(data)
                records.append(
                    {
                        "module": str(module.iri),
                        "locator": locator,
                        "digest": "sha256:" + hashlib.sha256(data).hexdigest(),
                    }
                )
            dependency = root / "src" / dep
            dependency.parent.mkdir(parents=True, exist_ok=True)
            dependency.write_bytes(source(dep))
            (root / "dist/sentinel").write_text("original", encoding="utf-8")
            reports = root / ".sdlc/runtime/policy-reports"
            reports.mkdir(parents=True)
            policy = publication.load_policy()
            receipt = {
                "receiptVersion": 1,
                "purpose": "latest-active",
                "qualifies": True,
                "policyIdentity": policy.identity,
                "lockIdentity": publication.lock_identity(root),
                "modules": records,
                "authorities": [
                    {"name": name, "digest": digest}
                    for name, digest in publication.authority_identities(
                        publication.AUTHORITIES_DIRECTORY, required_authorities(policy)
                    )
                ],
            }
            (reports / "qualification-receipt.json").write_text(
                json.dumps(receipt), encoding="utf-8"
            )
            generated = subprocess.run(
                [shutil.which("node"), str(root / "scripts/createFullVersions.js")],
                check=False,
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(generated.returncode, 0, generated.stderr)
            helper = root / "mock-helper.py"
            observation = root / "upload-observed.json"
            helper.write_text(
                "import json,sys\nfrom pathlib import Path\nr=Path(__file__).parent\ncandidate=Path(sys.argv[1])\n(r/'dist/sentinel').write_text('live changed',encoding='utf-8')\n(r/'upload-observed.json').write_text(json.dumps({'candidate':str(candidate),'sentinel':(candidate/'sentinel').read_text(encoding='utf-8'),'args':sys.argv[2:]}),encoding='utf-8')\n",
                encoding="utf-8",
            )
            full = root / "dist/universal/core/20260912-full.jsonld"
            original = full.read_bytes()
            forbidden = root / "dist/iso/31073/ed-1/20260912-full"
            with (
                mock.patch.object(upload_to_s3, "SCRIPT_DIRECTORY", root / "scripts"),
                mock.patch.object(upload_to_s3, "HELPER_SCRIPT_PATH", helper),
            ):
                for force in (False, True):
                    arguments = ["--force"] if force else []
                    with self.subTest(force=force, case="valid"):
                        (root / "dist/sentinel").write_text(
                            "original", encoding="utf-8"
                        )
                        upload_to_s3.main(arguments)
                        observed = json.loads(observation.read_text(encoding="utf-8"))
                        self.assertEqual(observed["sentinel"], "original")
                        self.assertNotEqual(Path(observed["candidate"]), root / "dist")
                        self.assertEqual("force" in observed["args"], force)
                        observation.unlink()
                    for fault in ("corrupt", "forbidden"):
                        with self.subTest(force=force, case=fault):
                            if fault == "corrupt":
                                full.write_bytes(b"corrupt")
                            else:
                                forbidden.write_bytes(b"unknown stale output")
                            try:
                                with self.assertRaises(SystemExit) as stop:
                                    upload_to_s3.main(arguments)
                                self.assertEqual(stop.exception.code, 2)
                                self.assertFalse(observation.exists())
                            finally:
                                if fault == "corrupt":
                                    full.write_bytes(original)
                                else:
                                    forbidden.unlink()
