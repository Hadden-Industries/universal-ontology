"""Editing-policy validation for the Universal Ontology.

Canonical SHACL under ``policy/`` owns every editing obligation, value constraint
and severity. This package supplies only trusted facts (run purpose, module
identities, ownership, change kinds), executes the native engine and presents
results. Nothing here decides whether a value is acceptable.
"""
from .modules import OwnedModule, load_owned_modules
from .snapshots import ModuleSource, read_module_source
from .validation import RunPurpose, ValidationOutcome, validate_sources

__all__ = [
    "ModuleSource",
    "OwnedModule",
    "RunPurpose",
    "ValidationOutcome",
    "load_owned_modules",
    "read_module_source",
    "validate_sources",
]
