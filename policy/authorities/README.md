# Pinned authority snapshots

Immutable local snapshots of the vocabularies the DCAT distribution rules check
membership against. Each authority has three files:

| File | Content |
|---|---|
| `raw/<name>.<ext>` | The exact payload retrieved from the source, kept byte-exact (`.gitattributes` disables normalisation) |
| `<name>.members.ttl` | Derived membership graph: `<member> uop:memberOf <authority>` |
| `<name>.provenance.json` | Source URL, retrieval date, raw SHA-256 and byte count, media type, licence, owner rights decision, parser identity, transformation, member count, derived digest |

| Authority | Source | Members (2026-09-12) | Rights |
|---|---|---|---|
| `iana-media-types` | https://www.iana.org/assignments/media-types/media-types.xml (registry updated 2026-09-03) | 2,346 | IANA protocol registry data |
| `loc-iso639-1` | https://id.loc.gov/vocabulary/iso639-1.rdf | 183 | US Government work, no known copyright restrictions |
| `eu-file-type` | http://publications.europa.eu/resource/authority/file-type | 228 | EU Vocabularies, reuse under Commission Decision 2011/833/EU (CC BY 4.0), source acknowledged |

Max approved these rights on 12 September 2026 (PR #61). Regenerate only
through the explicit maintenance command, after retrieving and reviewing a new
payload:

```sh
node scripts/runRepositoryPython.js scripts/update_policy_authorities.py \
  --raw <name>=policy/authorities/raw/<file> --retrieved-on YYYY-MM-DD \
  --licence <name>="..." --rights-decision <name>="..."
```

`--check` reconciles the stored snapshot against a payload without writing. A
missing, corrupt or unreconciled snapshot makes every policy run an execution
error (exit 2); it never becomes an empty authority.
