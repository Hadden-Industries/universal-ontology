# Security Policy

## Supported revisions

Security maintenance currently targets the latest revision of `main`. Report the
exact commit and, where relevant, the affected deployed site, generated ontology
artefact, or MCP component. Older revisions and locally modified deployments do
not have a separately maintained security branch; a remedy may require updating
to the current revision.

The repository-local MCP distribution is development-only. A package version in
this repository does not establish a published or security-supported release.
Any future release-support policy will be stated explicitly here.

## Privately report a vulnerability

Do not disclose suspected vulnerabilities through public issues, pull requests,
discussions, or the Code of Conduct reporting process.

Use these channels in order:

1. [GitHub private vulnerability reporting](https://github.com/Hadden-Industries/universal-ontology/security/advisories/new)
   is preferred because it opens a private repository advisory.
2. If that mechanism is unavailable or unsuitable, email
   `security@haddenindustries.com`.

Include the affected revision or version, environment, impact, reproduction
steps or a minimal proof of concept, and any relevant mitigation. Provide only
what is reasonably necessary; redact credentials, production data, and unrelated
personal information. See the [communication privacy notice](PRIVACY.md) before
submitting a report.

The project aims to acknowledge private reports within **five working days**.
This is a target, not an SLA, a guaranteed resolution time, or a promise that a
report will be accepted as a vulnerability. Maintainers may ask for information
about reproducibility, affected revisions, severity, coordination needs, and
your preferred contact method.

## Handling and disclosure

Confirmed vulnerabilities are normally coordinated through a private GitHub
security advisory. The project will request or associate a CVE where warranted
and coordinate disclosure after a fix or effective mitigation is available,
unless an overriding safety or legal reason is recorded.

Urgent security fixes still follow the applicable repository
[SDLC](docs/sdlc/howto.md), review, verification, and release controls. Deployment
and publication require their separate authorizations. Keep embargoed details
and reporter personal information out of public issues, commits, test fixtures,
and verification evidence until appropriate disclosure.

Ordinary ontology corrections and feature requests belong in public issues when
they contain no security-sensitive information. Behavioural concerns use the
private [Code of Conduct process](CODE_OF_CONDUCT.md). Privacy-rights requests
belong to `privacy@haddenindustries.com`.
