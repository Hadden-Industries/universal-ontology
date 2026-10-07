# Markdown tooling notices

The private `tooling/markdown` project is development tooling, outside the application's MIT workspaces and shipped dependency graphs.

It installs the coordinated public `@hadden-industries/markdown-quality` release 1.0.3 and its Windows x64 or Linux x64 native package through the integrity-pinned lockfile.
The capability and native packages are licensed AGPL-3.0-only.
Their source and supplied notices remain available in the installed packages and at [the immutable release source](https://github.com/Hadden-Industries/markdown-quality/tree/92d6e9f61b5fffe6f33d8878ef8e2880ca187ac0).
Transitive packages retain their own licenses and supplied notices; the lockfile records their package identities, integrity and declared licenses.

The trusted candidate checker, negative probes and resource observer under `scripts` adapt OwlAPI source at revision `4230572fdfb476adb8cb98af8afea95ba70dd741`.
Copyright 2026 Maksym Shostak; project stewardship HADDEN INDUSTRIES LTD.
These copied and adapted files remain AGPL-3.0-only; [the complete unmodified license](LICENSE) applies to them.
The canonical acquisition and command orchestration scripts also remain AGPL-3.0-only development tooling.
Their distribution as repository tooling does not relicense the application or existing third-party materials.

The isolated graph overrides only `micromark-extension-math`'s KaTeX dependency to a patched version at or above 0.18.2 and below 1.
The concrete initial graph resolved vulnerable KaTeX, as documented by [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
The reviewed lock resolves 0.19.0.
The acquisition audit on 2026-10-07 reported zero known vulnerabilities; this dated observation does not replace later audits.
Native consumer and trust probes exercise the isolated graph; hosted qualification is recorded separately.
