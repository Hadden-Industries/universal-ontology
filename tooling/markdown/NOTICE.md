# Markdown tooling notices

The private `tooling/markdown` project is development tooling, outside the application's MIT workspaces and shipped dependency graphs.

It installs the qualified producer archive tuple at source `2a8f162cd98a8548d8fa7b065cd6fe1828efcab7` through the integrity-pinned lockfile and retained core, Windows x64 and Linux x64 archives.
Their retained manifest version is 1.0.3; the published registry release with that version has different implementation bytes.
The capability and native packages are licensed AGPL-3.0-only.
Their supplied licenses, notices, rights manifests and native source offers remain in the retained archives and installed packages, with [immutable producer source](https://github.com/Hadden-Industries/markdown-quality/tree/2a8f162cd98a8548d8fa7b065cd6fe1828efcab7).
Transitive packages retain their own licenses and supplied notices; the lockfile records their package identities, integrity and declared licenses.

The copied candidate checker, probes, runner and resource observer have been retired from UO; those mechanisms now belong to the package and immutable producer workflow.
The retained acquisition script remains AGPL-3.0-only development tooling; [the complete unmodified license](LICENSE) applies.
Development-tool distribution does not relicense the application or existing third-party materials.

The isolated graph overrides only `micromark-extension-math`'s KaTeX dependency to a patched version at or above 0.18.2 and below 1.
The concrete initial graph resolved vulnerable KaTeX, as documented by [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
The reviewed lock resolves 0.19.0.
The acquisition audit on 2026-10-07 reported zero known vulnerabilities; this dated observation does not replace later audits.
UO retains domain-specific consumer assertions; producer transport and trust probes are package-owned.
Hosted consumer qualification and acceptance remain separately attributable evidence.
