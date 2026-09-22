# Contributing to Universal Ontology

Issues, source-backed ontology corrections, tests, documentation, and focused pull requests are welcome.
Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.
You can use whatever editor, assistant, or working method you prefer; only the submitted change and its explanation are reviewed.

## Choose the right channel

Open an issue, or go straight to a pull request for a small, self-contained fix.
Discuss substantial changes to concept meanings, public contracts, dependencies, or architecture early, so that effort is not wasted on an approach the project cannot accept.
You do not need prior permission to propose a configuration or dependency change in your fork; say what it changes and why.

Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md).
Report conduct concerns through [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Do not put either kind of report in a public issue or pull request.
The [privacy notice](PRIVACY.md) explains handling of private correspondence.

## Ontology changes and provenance

Explain the concept, its intended boundary, authoritative sources, and the effect on related concepts and consumers.
Distinguish source statements from your interpretation.
Provide precise source references and retain required attribution and notices.
An available definition or standard is not necessarily licensed for copying; check the applicable rights before contributing it.

Names and definitions must preserve meaningful semantic distinctions.
The SHACL editing policy in `policy/` is the source of truth for structural rules; see [docs/policy/README.md](docs/policy/README.md) for where the rules, their generated summary, and the publication checks live.
Passing the policy does not by itself establish that a definition is correct; reviewers assess meaning too.

## Contribution licence and copyright

Project-owned contributions are submitted under the repository's existing [MIT licence](LICENSE).
Contributors retain copyright and must have authority to submit the material under those terms, including any necessary employer, client, or co-author permission.
Submission does not transfer copyright.

Third-party materials remain subject to their applicable licences and notices; they are not automatically relicensed under MIT.
Preserve the attribution and restrictions described in the [README](README.md) and relevant source material.

## Development and verification

[docs/development.md](docs/development.md) describes setup, what each command does, the optional integrations, and the verification commands.
Local tooling is optional: if you cannot run a check, say so in the pull request and ask for help.
Maintainers can run checks for you, and GitHub runs the applicable ones on every pull request.
The project still needs enough evidence before accepting a change; it does not need that evidence to come from your machine.

Change generated artefacts through their owning source and generator, and verify the generated result rather than patching it by hand.
`npm run build` applies lint and formatting auto-fixes; when you need to preserve tracked inputs, use the direct build:

```sh
node node_modules/vite/bin/vite.js build
```

## Preparing a pull request

- Keep the change cohesive.
  Say what problem it addresses, what changes for users or consumers, what you checked, and — for ontology changes — the meaning and sources.
- Fill in the pull request template.
  It has four short sections and asks for nothing else; there are no required labels, identifiers, or attestations.
- Preserve other contributors' work and existing notices.
- Keep credentials, restricted reports, personal data, and machine-specific configuration out of commits.

Review may ask for clarification, smaller changes, or further evidence, and may request specific evidence for a concrete risk.
[REVIEW.md](REVIEW.md) describes what reviewers look for.
Review does not itself authorize merging, deployment, or publication; those remain subject to the repository's existing controls.
