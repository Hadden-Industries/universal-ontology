# Review guidance

Review the actual diff against what the pull request says it does.
Reviewers report; they do not rewrite the change or approve their own work.

## What to look at

1. **Correctness.**
   Does the change do what it claims, including error paths?
   Are the tests meaningful for the behaviour changed — real inputs, an independent expected result, and both required and prohibited outcomes — or do they merely agree with the implementation?
2. **Domain meaning and provenance.**
   For ontology changes: do the definitions, names and relations preserve meaningful semantic distinctions; are the sources precise and correctly interpreted; are rights and attribution respected?
   The SHACL policy checks structure, not meaning.
3. **Affected consumers.**
   Who else reads this — generated artefacts, the query and projection packages, the MCP server, the website, publication, CI?
   Have they been updated or explicitly left unchanged?
4. **Names.**
   Added or changed identifiers, files and options should say what they now do.
   A retained name whose responsibility changed is a defect too.
5. **Security and compatibility.**
   Trust boundaries, credentials, untrusted input, dependency and workflow changes, identifier or interface changes, and migrations deserve explicit attention when the change touches them.
6. **Scope.**
   Unrelated rewrites, speculative features and undocumented configuration changes make review harder; ask for them to be split out.

## Findings

Say where, what you expected, what you see, and what would resolve it.
Distinguish an actionable defect from a preference, and say which is which.
Do not report formatting that CI already enforces.

Missing evidence is a finding, not proof of absence: if a claim in the description cannot be checked from the diff, tests, or CI, ask for it.
A contributor may honestly be unable to run something; a maintainer can then run it or accept the gap explicitly.

Review does not require a particular tool, scanner, assistant or working method from the contributor, and approval on GitHub is the only approval that counts.
