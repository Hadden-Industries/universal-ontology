"""Disposable Wiki ownership, replay and tamper refusal contracts."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from ontology_policy import publish_wiki  # noqa: E402
from ontology_policy.documentation_outputs import json_bytes  # noqa: E402
from ontology_policy.publish_wiki import (  # noqa: E402
    assert_wiki_base,
    merge_sidebar,
    prepare_publication,
    prepare_verified_publication,  # noqa: E402
)

INPUT_DIGEST = "sha256:" + hashlib.sha256(b"input").hexdigest()
OLD_DIGEST = "sha256:" + hashlib.sha256(b"old").hexdigest()
NEW_DIGEST = "sha256:" + hashlib.sha256(b"new").hexdigest()


class WikiPublicationTest(unittest.TestCase):
    def test_legacy_page_adoption_requires_exact_bytes_and_explicit_decision(self):
        with tempfile.TemporaryDirectory() as temporary:
            wiki = Path(temporary)
            (wiki / "Editing-Policy.md").write_bytes(b"legacy page")
            (wiki / "Other.md").write_bytes(b"sentinel")
            files = {"Editing-Policy.md": hashlib.sha256(b"legacy page").hexdigest()}
            with self.assertRaisesRegex(ValueError, "explicit decision"):
                prepare_publication(
                    wiki,
                    {"Editing-Policy.md": b"new page"},
                    "nav",
                    INPUT_DIGEST,
                    initial_files=files,
                )
            with self.assertRaisesRegex(ValueError, "modified"):
                prepare_publication(
                    wiki,
                    {"Editing-Policy.md": b"new page"},
                    "nav",
                    INPUT_DIGEST,
                    initial_files={"Editing-Policy.md": "0" * 64},
                    initial_decision="fixture adoption",
                )
            result = prepare_publication(
                wiki,
                {"Editing-Policy.md": b"new page"},
                "nav",
                INPUT_DIGEST,
                initial_files=files,
                initial_decision="fixture adoption",
            )
            self.assertEqual(result["initialOwnershipDecision"], "fixture adoption")
            self.assertEqual(
                prepare_publication(
                    wiki,
                    {"Editing-Policy.md": b"new page"},
                    "nav",
                    INPUT_DIGEST,
                    initial_files=files,
                    initial_decision="fixture adoption",
                ),
                result,
            )
            self.assertEqual((wiki / "Other.md").read_bytes(), b"sentinel")

    def test_concurrent_remote_advance_is_refused_in_disposable_git_repositories(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            remote, wiki = root / "remote.git", root / "wiki"

            def git(*arguments, input=None):
                return subprocess.run(
                    ["git", *map(str, arguments)],
                    input=input,
                    text=True,
                    capture_output=True,
                    check=True,
                    timeout=30,
                ).stdout.strip()

            git("init", "--bare", "--initial-branch=main", remote)
            tree = git("-C", remote, "mktree", input="")
            # Unsigned synthetic objects are fixture state, not delivery commits.
            first = git(
                "-C",
                remote,
                "-c",
                "user.name=Fixture",
                "-c",
                "user.email=fixture@example.invalid",
                "-c",
                "commit.gpgsign=false",
                "commit-tree",
                tree,
                "-m",
                "Initial fixture",
            )
            git("-C", remote, "update-ref", "refs/heads/main", first)
            git("clone", "--no-hardlinks", remote, wiki)
            assert_wiki_base(wiki, first)
            second = git(
                "-C",
                remote,
                "-c",
                "user.name=Fixture",
                "-c",
                "user.email=fixture@example.invalid",
                "-c",
                "commit.gpgsign=false",
                "commit-tree",
                tree,
                "-p",
                first,
                "-m",
                "Concurrent fixture",
            )
            git("-C", remote, "update-ref", "refs/heads/main", second, first)
            with self.assertRaisesRegex(ValueError, "Remote Wiki base changed"):
                assert_wiki_base(wiki, first)
            with self.assertRaisesRegex(ValueError, "Local Wiki base changed"):
                assert_wiki_base(wiki, second)

    def test_qualified_manifest_binds_inputs_and_outputs_before_any_wiki_write(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            repository, wiki = root / "source", root / "wiki"
            bundle = repository / "docs/policy"
            bundle.mkdir(parents=True)
            wiki.mkdir()
            (repository / "source.ttl").write_bytes(b"accepted input")
            (bundle / "Editing-Policy.generated.md").write_bytes(b"# Policy\n")
            (bundle / "Editing-Policy.sidebar.md").write_bytes(
                b"[Editing Policy](Editing-Policy)\n"
            )
            inputs = {"source.ttl": hashlib.sha256(b"accepted input").hexdigest()}
            manifest = {
                "schemaVersion": 1,
                "inputDigestAlgorithm": "sha256",
                "inputDigest": "sha256:"
                + hashlib.sha256(json_bytes(inputs)).hexdigest(),
                "inputs": inputs,
                "outputs": {
                    path.name: {
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "bytes": len(path.read_bytes()),
                    }
                    for path in sorted(bundle.iterdir())
                },
            }
            raw = json_bytes(manifest)
            (bundle / "Editing-Policy.manifest.json").write_bytes(raw)
            digest = hashlib.sha256(raw).hexdigest()
            (bundle / "Editing-Policy.generated.md").write_bytes(
                b"unqualified replacement"
            )
            with self.assertRaisesRegex(ValueError, "Qualified output changed"):
                prepare_verified_publication(wiki, repository, digest)
            self.assertEqual(list(wiki.iterdir()), [])
            (bundle / "Editing-Policy.generated.md").write_bytes(b"# Policy\n")
            (repository / "source.ttl").write_bytes(b"changed source")
            with self.assertRaisesRegex(ValueError, "Qualified source input changed"):
                prepare_verified_publication(wiki, repository, digest)
            self.assertEqual(list(wiki.iterdir()), [])
            (repository / "source.ttl").write_bytes(b"accepted input")
            prepare_verified_publication(wiki, repository, digest)
            self.assertEqual((wiki / "Editing-Policy.md").read_bytes(), b"# Policy\n")

    def test_interrupted_writes_replay_without_claiming_unrelated_content(self):
        for failure_after in range(1, 5):
            with (
                self.subTest(failure_after=failure_after),
                tempfile.TemporaryDirectory() as temporary,
            ):
                wiki = Path(temporary)
                (wiki / "Other.md").write_bytes(b"keep")
                prepare_publication(
                    wiki,
                    {
                        "Editing-Policy.md": b"old",
                        "assets/editing-policy/stale.svg": b"stale",
                    },
                    "old nav",
                    OLD_DIGEST,
                )
                count = 0
                native_write = publish_wiki._write

                def interrupted(path, raw):
                    nonlocal count
                    native_write(path, raw)
                    count += 1
                    if count == failure_after:
                        raise OSError("injected interruption")

                outputs = {
                    "Editing-Policy.md": b"new",
                    "assets/editing-policy/new.svg": b"new asset",
                }
                with (
                    patch.object(publish_wiki, "_write", side_effect=interrupted),
                    self.assertRaisesRegex(OSError, "injected"),
                ):
                    prepare_publication(wiki, outputs, "new nav", NEW_DIGEST)
                prepare_publication(wiki, outputs, "new nav", NEW_DIGEST)
                self.assertEqual((wiki / "Editing-Policy.md").read_bytes(), b"new")
                self.assertEqual((wiki / "Other.md").read_bytes(), b"keep")
                self.assertFalse((wiki / "assets/editing-policy/stale.svg").exists())
                self.assertFalse((wiki / publish_wiki.JOURNAL).exists())

    def test_sidebar_preserves_unmanaged_bytes_and_rejects_ambiguous_markers(self):
        old = "Manual navigation\r\n\r\n- [Other](Other)\r\n"
        once = merge_sidebar(old, "[Editing Policy](Editing-Policy)\n")
        self.assertTrue(once.startswith(old))
        self.assertEqual(
            merge_sidebar(once, "[Editing Policy](Editing-Policy)\n"), once
        )
        with self.assertRaisesRegex(ValueError, "markers"):
            merge_sidebar(
                once + "<!-- BEGIN GENERATED EDITING POLICY NAVIGATION -->", "new"
            )

    def test_preparation_is_idempotent_and_preserves_sentinels(self):
        with tempfile.TemporaryDirectory() as temporary:
            wiki = Path(temporary)
            (wiki / "Other.md").write_bytes(b"keep\r\n")
            (wiki / "_Sidebar.md").write_bytes(b"Manual\r\n")
            outputs = {
                "Editing-Policy.md": b"# Policy\n",
                "assets/editing-policy/diagram.svg": b"<svg/>",
            }
            first = prepare_publication(
                wiki, outputs, "[Editing Policy](Editing-Policy)\n", INPUT_DIGEST
            )
            before = {
                p.relative_to(wiki).as_posix(): p.read_bytes()
                for p in wiki.rglob("*")
                if p.is_file()
            }
            self.assertEqual(
                prepare_publication(
                    wiki, outputs, "[Editing Policy](Editing-Policy)\n", INPUT_DIGEST
                ),
                first,
            )
            self.assertEqual(
                before,
                {
                    p.relative_to(wiki).as_posix(): p.read_bytes()
                    for p in wiki.rglob("*")
                    if p.is_file()
                },
            )
            self.assertEqual((wiki / "Other.md").read_bytes(), b"keep\r\n")
            self.assertTrue(
                (wiki / "_Sidebar.md").read_bytes().startswith(b"Manual\r\n")
            )

    def test_path_escape_unowned_collision_and_modified_owned_file_are_refused(self):
        with tempfile.TemporaryDirectory() as temporary:
            wiki = Path(temporary)
            for path in (
                "../outside",
                "assets/editing-policy/../../Other.md",
                "/absolute",
                "C:/absolute",
                "assets\\editing-policy\\escape",
                "Other.md",
            ):
                with self.subTest(path=path), self.assertRaises(ValueError):
                    prepare_publication(wiki, {path: b"bad"}, "nav", INPUT_DIGEST)
            (wiki / "Editing-Policy.md").write_bytes(b"unowned")
            with self.assertRaisesRegex(ValueError, "unowned"):
                prepare_publication(
                    wiki, {"Editing-Policy.md": b"new"}, "nav", INPUT_DIGEST
                )
            (wiki / "Editing-Policy.md").unlink()
            prepare_publication(
                wiki, {"Editing-Policy.md": b"old"}, "nav", INPUT_DIGEST
            )
            (wiki / "Editing-Policy.md").write_bytes(b"externally changed")
            with self.assertRaisesRegex(ValueError, "modified"):
                prepare_publication(
                    wiki, {"Editing-Policy.md": b"new"}, "nav", INPUT_DIGEST
                )

    def test_prior_manifest_cannot_claim_unrelated_files_and_stale_files_require_digest(
        self,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            wiki = Path(temporary)
            (wiki / "Other.md").write_bytes(b"keep")
            manifest = {
                "schemaVersion": 1,
                "inputDigest": OLD_DIGEST,
                "files": {"Other.md": hashlib.sha256(b"keep").hexdigest()},
            }
            (wiki / ".editing-policy-publication-manifest.json").write_text(
                json.dumps(manifest), encoding="utf-8"
            )
            with self.assertRaises(ValueError):
                prepare_publication(
                    wiki, {"Editing-Policy.md": b"new"}, "nav", NEW_DIGEST
                )
            self.assertEqual((wiki / "Other.md").read_bytes(), b"keep")


if __name__ == "__main__":
    unittest.main()
