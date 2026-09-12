"""Namespaces shared by the policy graph, the runner and the renderer."""
from pathlib import Path

from rdflib import Namespace

UOP = Namespace("https://haddenindustries.com/ontology/policy#")
UOC = Namespace("https://haddenindustries.com/ontology/policy/context#")
EP = Namespace("https://haddenindustries.com/ontology/policy/editing/")
UOA = Namespace("https://haddenindustries.com/ontology/policy/activation/")

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
POLICY_DIRECTORY = REPOSITORY_ROOT / "policy"

# Policy files that carry editing rules and human clauses. Context and metadata
# shapes are contracts about the runner and the policy graph, not editing rules,
# so they are loaded separately.
RULE_FILENAMES = (
    "editing-policy.ttl",
    "entity-policy.ttl",
    "ontology-policy.ttl",
    "axiom-policy.ttl",
    "dataset-distribution-policy.ttl",
)
CONTEXT_SHAPES_FILENAME = "validation-context-shapes.ttl"
POLICY_METADATA_SHAPES_FILENAME = "policy-metadata-shapes.ttl"
ACTIVATION_FILENAME = "activation.ttl"
