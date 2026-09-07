"""Pinned source and preservation contracts for repository skill activation."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import set_up_agent_skills as setup


class PinnedSkillSourceTests(unittest.TestCase):
    """The recorded commit must be the only revision offered to Skills CLI."""

    SHA = "1234567890abcdef1234567890abcdef12345678"

    def entry(self, source_url=None, *, source="example/skills", source_type="github"):
        result = {"source": source, "sourceType": source_type,
                  "ref": self.SHA, "computedHash": "0" * 64}
        if source_url is not None:
            result["sourceUrl"] = source_url
        return result

    def test_conflicting_source_selectors_stop_setup_before_installation(self):
        # These are distinct native CLI paths: fragment, GitHub/GitLab tree,
        # and hosted archive/download. A separate valid ref must not bless them.
        for source_url in (
            "https://github.com/example/skills#main",
            "https://github.com/example/skills/tree/main",
            "https://github.com/example/skills/tree/main/skills/review",
            "https://gitlab.com/example/skills/-/tree/main",
            "https://github.com/example/skills/archive/refs/heads/main.zip",
            "https://raw.githubusercontent.com/example/skills/main/SKILL.md",
            "https://github.com/example/skills#" + self.SHA,
            "https://github.com/example/skills?ref=main",
            "https://github.com/example/skills/%74ree/main",
        ):
            with self.subTest(source_url=source_url), tempfile.TemporaryDirectory() as directory:
                repo = Path(directory)
                subprocess.run(["git", "init", "--quiet", directory], check=True, capture_output=True)
                (repo / ".gitignore").write_text(".agents/skills/\n", encoding="utf-8")
                lock = repo / "skills-lock.json"
                contents = json.dumps({"version": 1, "skills": {
                    "first-pinned": self.entry(), "selected": self.entry(source_url)}})
                lock.write_text(contents, encoding="utf-8")
                with patch.object(setup, "sync_source", side_effect=AssertionError("Installer ran before source preflight completed")) as install:
                    with self.assertRaises(setup.SetupError):
                        setup.ensure_agent_skills(repo, ("codex",))
                    install.assert_not_called()
                self.assertEqual(lock.read_text(encoding="utf-8"), contents)
                self.assertFalse((repo / ".agents").exists())

    def test_repository_root_and_recorded_commit_are_preserved(self):
        for entry, expected in (
            (self.entry(), "https://github.com/example/skills.git"),
            (self.entry("https://github.com/example/skills"), "https://github.com/example/skills.git"),
            (self.entry("https://github.com/example/skills.git"), "https://github.com/example/skills.git"),
            (self.entry("https://gitlab.com/example/team/skills.git", source="example/team/skills", source_type="gitlab"), "https://gitlab.com/example/team/skills.git"),
            (self.entry("https://git.example.org/team/skills.git", source="team/skills", source_type="git"), "https://git.example.org/team/skills.git"),
            (self.entry("git@git.example.org:team/skills.git", source="team/skills", source_type="git"), "git@git.example.org:team/skills.git"),
            (self.entry("ssh://git@git.example.org/team/skills.git", source="team/skills", source_type="git"), "ssh://git@git.example.org/team/skills.git"),
        ):
            with self.subTest(entry=entry):
                grouped = setup.group_skills_by_install_source({"selected": entry})
                self.assertEqual(grouped, {f"{expected}#{self.SHA}": ("selected",)})

    def test_local_type_cannot_disguise_a_remote_source(self):
        for source in ("https://github.com/example/skills", "example/skills", "git@example.org:skills.git"):
            with self.subTest(source=source):
                entry = self.entry(source=source, source_type="local")
                entry.pop("ref")
                with self.assertRaises(setup.SetupError):
                    setup.group_skills_by_install_source({"selected": entry})

    def test_enterprise_host_tree_cannot_override_the_commit(self):
        entry = self.entry("https://git.example.org/team/skills/tree/main.git", source="team/skills", source_type="git")
        for host in ("git.example.org", " GIT.EXAMPLE.ORG/ "):
            with self.subTest(host=host), patch.dict(os.environ, {"GH_HOST": host}):
                with self.assertRaises(setup.SetupError):
                    setup.group_skills_by_install_source({"selected": entry})

    def test_local_path_does_not_require_a_remote_commit(self):
        entry = {"source": "./owned-skill", "sourceType": "local", "computedHash": "0" * 64}
        self.assertEqual(setup.group_skills_by_install_source({"selected": entry}),
                         {"./owned-skill": ("selected",)})

    def test_each_remote_source_requires_a_full_commit(self):
        for ref in (None, "main", "v1.0.0", self.SHA[:12], self.SHA + "@review"):
            with self.subTest(ref=ref):
                entry = self.entry()
                entry["ref"] = ref
                with self.assertRaisesRegex(setup.SetupError, "full Git commit SHA"):
                    setup.group_skills_by_install_source({"selected": entry})

    def test_skill_grouping_keeps_different_commits_separate(self):
        other = self.entry()
        other["ref"] = "a" * 40
        grouped = setup.group_skills_by_install_source({"first": self.entry(), "second": other})
        self.assertEqual(grouped, {
            f"https://github.com/example/skills.git#{self.SHA}": ("first",),
            "https://github.com/example/skills.git#" + "a" * 40: ("second",),
        })


class SkillActivationPreservationTests(unittest.TestCase):
    def test_verification_preserves_an_unrelated_standalone_skill(self):
        with tempfile.TemporaryDirectory() as directory:
            path_anchor = Path(directory) / "path-anchor"
            path_anchor.mkdir()
            repo = path_anchor / ".."
            root = repo / ".agents" / "skills"
            for name in ("selected", "user-owned"):
                (root / name).mkdir(parents=True)
                (root / name / "SKILL.md").write_text(
                    f"---\nname: {name}\ndescription: Retained skill\n---\n",
                    encoding="utf-8",
                )
            user_file = root / "user-owned" / "SKILL.md"
            before = user_file.read_bytes()
            setup.verify_final_state(repo, {"selected"}, ("codex",))
            self.assertEqual(user_file.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
