"""Run-purpose choices are available before the optional SHACL stack is installed."""

from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from rdflib import URIRef


class RunPurpose(Enum):
    LATEST_ACTIVE = "latest-active"
    CANDIDATE = "candidate"
    DRAFT = "draft"
    CRITICAL_FIX = "critical-fix"

    @property
    def iri(self) -> URIRef:
        from ontology_policy.namespaces import UOC

        return {
            RunPurpose.LATEST_ACTIVE: UOC.LatestActiveQualification,
            RunPurpose.CANDIDATE: UOC.CandidateQualification,
            RunPurpose.DRAFT: UOC.DraftDiagnostics,
            RunPurpose.CRITICAL_FIX: UOC.CriticalHistoricalFix,
        }[self]

    @property
    def qualifies(self) -> bool:
        """Only complete latest-active/candidate runs can produce a qualification result."""
        return self in (RunPurpose.LATEST_ACTIVE, RunPurpose.CANDIDATE)


PURPOSE_CHOICES = tuple(purpose.value for purpose in RunPurpose)
