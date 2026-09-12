# Contributing to Universal Ontology

Issues, source-backed ontology corrections, tests, documentation, and focused pull
requests are welcome. Read the [Code of Conduct](CODE_OF_CONDUCT.md) before
participating.

## Choose the right channel

Use an existing issue or a focused proposal to explain an ordinary defect or
improvement. Discuss material changes to concept meanings, public contracts, or
architecture before investing in implementation. Small maintenance work can use
the task or pull request brief; it does not require a separate planning issue.

Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md).
Report conduct concerns through [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Do not
put either kind of report in a public issue or pull request. The
[privacy notice](PRIVACY.md) explains handling of private correspondence.

## Ontology changes and provenance

Explain the concept, its intended boundary, authoritative sources, and the
effect on related concepts and consumers. Distinguish source statements from
your interpretation. Provide precise source references and retain required
attribution and notices. An available definition or standard is not necessarily
licensed for copying; check the applicable rights before contributing it.

Names and definitions must preserve meaningful semantic distinctions. Follow
the repository's [engineering principles](docs/sdlc/engineering-principles.md)
and assess the resulting ontology meaning as well as automated validation.

## Contribution licence and copyright

Project-owned contributions are submitted under the repository's existing
[MIT licence](LICENSE). Contributors retain copyright and must have authority
to submit the material under those terms, including any necessary employer,
client, or co-author permission. Submission does not transfer copyright.

Third-party materials remain subject to their applicable licences and notices;
they are not automatically relicensed under MIT. Preserve the attribution and
restrictions described in the [README](README.md) and relevant source material.

## Development and verification

Follow the [development setup instructions](README.md#development-setup) for the
declared Node.js, npm, and Python versions. Read the documented installation and
configuration effects before running setup. Execute repository Python scripts
through the existing `.venv`; routine controls use the repository's `npm run`
entry points.

Follow the [SDLC guide](docs/sdlc/howto.md) and use the smallest justified risk
route. R0/R1 work can use an accepted task or PR brief; ordinary R2/R3 work needs
a previously accepted baseline. For implementation, use the repository-adapted
TDD procedure and meaningful tests of the affected behaviour. Prose changes use
appropriate link and content checks instead of ceremonial unit tests.

Run the checks required by the selected route and affected consumers. The SDLC
guide describes the JavaScript, Python, SDLC, lint, formatting, ontology, and
lifecycle verification controls. Report failed, skipped, or unavailable checks
honestly. Passing syntax or schema checks alone does not establish semantic
correctness.

Change generated artefacts through their owning source and generator. Verify
the generated result without manually patching it. `npm run build` invokes
auto-fixes; when verification must preserve tracked inputs, use the documented
direct command:

```sh
node node_modules/vite/bin/vite.js build
```

## Preparing a pull request

- Keep the change cohesive and explain the problem, resulting behaviour,
  affected ontology or software consumers, and relevant evidence.
- Complete the existing PR template with truthful risk, acceptance, and
  verification information. Follow [REVIEW.md](REVIEW.md).
- Preserve other contributors' work. Obtain the exact approval required before
  changing configuration, dependencies, workflows, or repository policy.
- Do not introduce compatibility shims without the specific prior override
  required by the engineering principles.
- Keep credentials, restricted reports, personal data, and machine-specific
  configuration out of commits and public evidence.
- Reconcile temporary artefacts using the
  [temporary-artefact procedure](docs/sdlc/temporary-artefacts-howto.md).

Review may require clarification, smaller changes, or further evidence. Review
does not itself authorize merging, deployment, or publication; those remain
subject to the repository's existing controls.
