# WP8 implementation-plan package

> Historical planning document. File references were updated during organization; proposal and recorded outcome statements retain their original scope. See the [initiative index](../README.md) for completion context and original delivery identities.

Prepared 11 September 2026. Start with
`implementation-plan.md`.
It expands the supplied parent's WP8, including A06/A14 and actual selective
adoption. This is a proposal, not implementation or permission to operate.

The worksheet and adoption-record amendments are optional drafting aids for the
existing accepted records. The verification catalogue contains 36 proposed cases
and four useful-work exercises, all explicitly not-run. The research observations
are curated from existing source/API reads, not newly executed CI or original raw
API envelopes. Do not treat a planning-file check as product qualification.

`check-deliverables.py` uses only the Python standard library. It checks the
planning package and, when supplied, the original input directory. For example:

```text
python wp8-check-deliverables.py --directory . --inputs-directory ORIGINAL_INPUTS --output new-check-result.json
```

Without `--inputs-directory`, it reports original-input preservation as not checked.
It does not run repository code, install dependencies, invoke GitHub, access a
browser, exercise native guards or modify the original files. It refuses to
replace an existing check-result path. Reuse a new result path for each execution.

The integrity manifest hashes the package payloads other than itself. The ZIP
readback record is supplied separately because an archive cannot contain a hash
of its own final bytes. These hashes establish byte identity, not approval,
authenticity, preservation durability or correctness of the proposed design.

The supplied parent and earlier WP documents are referenced, not duplicated in
this package. They remain the user's original materials and their hashes are
recorded in `input-identities.json`.

## Organized-copy boundary

The original delivery manifest and check results describe the historical package, before documentation references were edited. They do not verify this reorganized copy. The retained Python files are historical planning recipes; their embedded original filenames are not maintained execution instructions. Current navigation is checked separately.
