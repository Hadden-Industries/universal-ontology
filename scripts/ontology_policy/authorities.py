"""Pinned authority vocabularies: native ingestion, provenance and trusted membership.

Each authority is one immutable local snapshot derived from a raw payload with
the source's native parser. The derived members graph asserts
``<member> uop:memberOf <authority>`` and travels with a provenance record
(source URL, retrieval date, raw bytes hash and media type, licence and rights
decision, parser identity, member count, derived digest). Regeneration must
reconcile the same set; a missing or corrupt snapshot is an execution error.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import defusedxml
import rdflib
from defusedxml import ElementTree
from rdflib import RDF, SKOS, Graph, URIRef

from .namespaces import POLICY_DIRECTORY, UOP

AUTHORITY_NAMESPACE = "https://haddenindustries.com/ontology/policy/authority/"
AUTHORITIES_DIRECTORY = POLICY_DIRECTORY / "authorities"


class AuthorityError(Exception):
    """A snapshot is missing, corrupt, unreconciled or the payload is not the expected format; exit status 2."""


@dataclass(frozen=True)
class AuthoritySpecification:
    name: str
    source_url: str
    raw_filename: str
    media_type: str
    description: str

    @property
    def iri(self) -> URIRef:
        return URIRef(AUTHORITY_NAMESPACE + self.name)


AUTHORITY_SPECIFICATIONS: dict[str, AuthoritySpecification] = {
    "iana-media-types": AuthoritySpecification(
        "iana-media-types", "https://www.iana.org/assignments/media-types/media-types.xml", "iana-media-types.xml",
        "application/xml", "IANA Media Types registry; a member is https://www.iana.org/assignments/media-types/<template>",
    ),
    "loc-iso639-1": AuthoritySpecification(
        "loc-iso639-1", "https://id.loc.gov/vocabulary/iso639-1.rdf", "loc-iso639-1.rdf",
        "application/rdf+xml", "Library of Congress ISO 639-1 language vocabulary; members are its skos:Concept subjects",
    ),
    "eu-file-type": AuthoritySpecification(
        "eu-file-type", "http://publications.europa.eu/resource/authority/file-type", "eu-file-type.rdf",
        "application/rdf+xml", "EU Vocabularies File Type authority table; members are subjects in the file-type scheme",
    ),
}

_IANA_NS = "{http://www.iana.org/assignments}"
_IANA_MEMBER_PREFIX = "https://www.iana.org/assignments/media-types/"
_LOC_MEMBER_PREFIX = "http://id.loc.gov/vocabulary/iso639-1/"
_EU_SCHEME = URIRef("http://publications.europa.eu/resource/authority/file-type")


def _members_iana(raw: bytes) -> tuple[set[str], dict]:
    try:
        root = ElementTree.fromstring(raw)
    except Exception as exc:
        raise AuthorityError(f"IANA payload is not well-formed XML: {exc}") from exc
    if root.tag != f"{_IANA_NS}registry":
        raise AuthorityError("IANA payload is not the media-types registry document.")
    members = set()
    for record in root.iter(f"{_IANA_NS}record"):
        for file in record.findall(f"{_IANA_NS}file"):
            if file.get("type") == "template" and file.text:
                members.add(_IANA_MEMBER_PREFIX + file.text.strip())
    updated = root.findtext(f"{_IANA_NS}updated")
    if not members:
        raise AuthorityError("IANA payload contains no template records.")
    return members, {"sourceUpdated": updated}


def _members_rdf(raw: bytes, *, select, description: str) -> tuple[set[str], dict]:
    graph = Graph()
    try:
        graph.parse(data=raw, format="xml")
    except Exception as exc:
        raise AuthorityError(f"{description} payload is not parseable RDF/XML: {exc}") from exc
    members = {str(subject) for subject in select(graph)}
    if not members:
        raise AuthorityError(f"{description} payload contains no members.")
    return members, {"tripleCount": len(graph)}


def _members_loc(raw: bytes):
    return _members_rdf(
        raw,
        select=lambda graph: (s for s in graph.subjects(RDF.type, SKOS.Concept) if str(s).startswith(_LOC_MEMBER_PREFIX)),
        description="LOC ISO 639-1",
    )


def _members_eu(raw: bytes):
    return _members_rdf(
        raw,
        select=lambda graph: (s for s in graph.subjects(SKOS.inScheme, _EU_SCHEME) if isinstance(s, URIRef)),
        description="EU file-type",
    )


_EXTRACTORS = {"iana-media-types": _members_iana, "loc-iso639-1": _members_loc, "eu-file-type": _members_eu}


@dataclass(frozen=True)
class Snapshot:
    name: str
    member_count: int
    derived_sha256: str


def _members_turtle(specification: AuthoritySpecification, members: set[str]) -> bytes:
    lines = [
        f"# Derived membership snapshot of {specification.name}; regenerate with scripts/update_policy_authorities.py.",
        f"<{specification.iri}> <{RDF.type}> <{UOP.Authority}> .",
    ]
    lines.extend(f"<{member}> <{UOP.memberOf}> <{specification.iri}> ." for member in sorted(members))
    return ("\n".join(lines) + "\n").encode("utf-8")


def derive_snapshot(name: str, raw: bytes, directory: Path, rights: dict) -> Snapshot:
    """Parse the raw payload natively and write the members graph and its provenance record."""
    specification = AUTHORITY_SPECIFICATIONS[name]
    members, facts = _EXTRACTORS[name](raw)
    derived = _members_turtle(specification, members)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{name}.members.ttl").write_bytes(derived)
    provenance = {
        "authority": name,
        "authorityIri": str(specification.iri),
        "sourceUrl": specification.source_url,
        "mediaType": specification.media_type,
        "retrievedOn": rights["retrievedOn"],
        "rawSha256": hashlib.sha256(raw).hexdigest(),
        "rawByteCount": len(raw),
        "licence": rights["licence"],
        "rightsDecision": rights["rightsDecision"],
        "parser": "rdflib" if name != "iana-media-types" else "defusedxml",
        "parserVersion": rdflib.__version__ if name != "iana-media-types" else defusedxml.__version__,
        "transformation": {"iana-media-types": "template file names prefixed with the registry URL",
                           "loc-iso639-1": "skos:Concept subjects under the iso639-1 namespace",
                           "eu-file-type": "subjects with skos:inScheme file-type"}[name],
        "memberCount": len(members),
        "derivedSha256": hashlib.sha256(derived).hexdigest(),
        **facts,
    }
    (directory / f"{name}.provenance.json").write_text(json.dumps(provenance, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    return Snapshot(name, len(members), provenance["derivedSha256"])


def reconcile_snapshot(name: str, raw: bytes, directory: Path) -> tuple[str, ...]:
    """Problems that prevent the stored snapshot from being the derivation of this raw payload."""
    problems = []
    provenance_path = directory / f"{name}.provenance.json"
    members_path = directory / f"{name}.members.ttl"
    if not provenance_path.is_file() or not members_path.is_file():
        return (f"{name}: snapshot files are missing",)
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    if provenance.get("rawSha256") != hashlib.sha256(raw).hexdigest():
        problems.append(f"{name}: raw payload hash differs from the recorded rawSha256")
    derived = members_path.read_bytes()
    if provenance.get("derivedSha256") != hashlib.sha256(derived).hexdigest():
        problems.append(f"{name}: derived members file differs from the recorded derivedSha256")
    members, _ = _EXTRACTORS[name](raw)
    if _members_turtle(AUTHORITY_SPECIFICATIONS[name], members) != derived:
        problems.append(f"{name}: regenerating from the raw payload does not reproduce the stored members")
    if provenance.get("memberCount") != len(members):
        problems.append(f"{name}: recorded memberCount {provenance.get('memberCount')} differs from {len(members)}")
    return tuple(problems)


def load_authority_graph(directory: Path = AUTHORITIES_DIRECTORY, required=tuple(AUTHORITY_SPECIFICATIONS)) -> Graph:
    """Load the trusted membership graph; every required snapshot must exist, parse and match its provenance."""
    graph = Graph()
    for name in required:
        members_path = directory / f"{name}.members.ttl"
        provenance_path = directory / f"{name}.provenance.json"
        if not members_path.is_file() or not provenance_path.is_file():
            raise AuthorityError(f"Authority snapshot {name} is missing from {directory}; validation cannot proceed.")
        provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
        derived = members_path.read_bytes()
        if hashlib.sha256(derived).hexdigest() != provenance.get("derivedSha256"):
            raise AuthorityError(f"Authority snapshot {name} does not match its provenance digest.")
        part = Graph()
        try:
            part.parse(data=derived, format="turtle")
        except Exception as exc:
            raise AuthorityError(f"Authority snapshot {name} is not parseable: {exc}") from exc
        count = sum(1 for _ in part.subjects(UOP.memberOf, AUTHORITY_SPECIFICATIONS[name].iri))
        if count != provenance.get("memberCount") or count == 0:
            raise AuthorityError(f"Authority snapshot {name} has {count} members but provenance records {provenance.get('memberCount')}.")
        graph += part
    return graph


def authority_identities(directory: Path = AUTHORITIES_DIRECTORY, required=tuple(AUTHORITY_SPECIFICATIONS)) -> tuple[tuple[str, str], ...]:
    identities = []
    for name in required:
        provenance = json.loads((directory / f"{name}.provenance.json").read_text(encoding="utf-8"))
        identities.append((name, "sha256:" + provenance["derivedSha256"]))
    return tuple(identities)
