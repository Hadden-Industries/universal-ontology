"""Command boundary used by scripts/validate_ontologies.py for the SHACL path.

Purposes and their inputs:

* ``latest-active``: the complete active set from policy/activation.ttl, read
  from the exact dated artifacts; selection is ignored.
* ``candidate``: the selected sources (exact staged/committed bytes) replace
  their modules in the active set; every other module comes from its active
  artifact so cross-file context is complete.
* ``draft``: like candidate, but the result never qualifies activation.
* ``critical-fix``: explicitly scoped; not yet supported by this boundary.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

from .context import ContextError, RunPurpose
from .modules import OwnedModule, PolicyDefinitionError, load_owned_modules
from .policy import load_policy
from .reports import REPORT_DIRECTORY, format_results, github_annotation, write_report
from .authorities import AUTHORITIES_DIRECTORY, AuthorityError
from .snapshots import InputError, ModuleSource, read_module_source
from .validation import STATUS_ERROR, ValidationOutcome, validate_sources

PURPOSE_CHOICES = tuple(purpose.value for purpose in RunPurpose)


def module_for_path(modules: tuple[OwnedModule, ...], path: str) -> OwnedModule | None:
    """Map a working file or a dated artifact path to its reviewed module."""
    normalized = path.replace("\\", "/")
    for module in modules:
        if normalized == module.working_path:
            return module
        if module.active_artifact_path:
            directory = module.active_artifact_path.rsplit("/", 1)[0] + "/"
            if normalized.startswith(directory) and "-full" not in normalized:
                return module
    return None


@dataclass(frozen=True)
class SelectedSource:
    path: str
    revision: str | None  # None: working tree; "": index; otherwise a commit
    comparison_revision: str | None = None  # commit whose blob of the same path is the comparison; None: the active artifact


def assemble_sources(
    purpose: RunPurpose, selected: list[SelectedSource], modules: tuple[OwnedModule, ...], repository: Path | None = None
) -> list[ModuleSource]:
    """Resolve the exact module set for the purpose; unaccounted inputs are errors, not omissions."""
    replacements: dict = {}
    if purpose != RunPurpose.LATEST_ACTIVE:
        for item in selected:
            module = module_for_path(modules, item.path)
            if module is None:
                raise ContextError(f"{item.path} does not belong to a reviewed owned module (policy/activation.ttl).")
            if module.iri in replacements:
                raise ContextError(f"Two selected inputs replace the same module {module.label}: {replacements[module.iri].path} and {item.path}.")
            replacements[module.iri] = item
    sources = []
    for module in modules:
        item = replacements.get(module.iri)
        if item is not None:
            sources.append(read_module_source(module, item.path, revision=item.revision, repository=repository))
        elif module.active_artifact_path:
            sources.append(active_artifact_source(module, repository))
        else:
            raise ContextError(f"{module.label} has no active artifact and no selected replacement.")
    return sources


def active_artifact_source(module: OwnedModule, repository: Path | None = None) -> ModuleSource:
    """Read the activated artifact and refuse bytes that differ from the digest recorded at activation."""
    source = read_module_source(module, module.active_artifact_path, repository=repository)
    if module.active_content_digest and source.digest != module.active_content_digest:
        raise ContextError(
            f"{module.active_artifact_path} no longer matches the activation record "
            f"({module.active_content_digest} recorded, {source.digest} now); re-activate through the qualified procedure."
        )
    return source


def assemble_comparisons(
    purpose: RunPurpose, selected: list[SelectedSource], modules: tuple[OwnedModule, ...], repository: Path | None = None
) -> dict:
    """Previous snapshot per module: the active artifact for a replaced module, or the base commit's blob.

    A latest-active run has no comparison unless one is supplied, so its change
    obligations are reported as unevaluated rather than invented.
    """
    comparisons: dict = {module.iri: None for module in modules}
    if purpose == RunPurpose.LATEST_ACTIVE:
        return comparisons
    for item in selected:
        module = module_for_path(modules, item.path)
        if module is None:
            continue
        if item.comparison_revision is not None:
            try:
                comparisons[module.iri] = read_module_source(module, item.path, revision=item.comparison_revision, repository=repository)
            except InputError:
                comparisons[module.iri] = None  # added in this change: no previous blob
        elif module.active_artifact_path:
            comparisons[module.iri] = active_artifact_source(module, repository)
    for module in modules:
        if comparisons[module.iri] is None and module.iri not in {module_for_path(modules, i.path).iri for i in selected if module_for_path(modules, i.path)}:
            # unreplaced modules are their own active artifact: unchanged by construction
            if module.active_artifact_path:
                comparisons[module.iri] = active_artifact_source(module, repository)
    return comparisons


def run_policy_validation(
    purpose: RunPurpose, selected: list[SelectedSource], *, repository: Path | None = None, github_actions: bool = False,
    stream=None, authorities_directory: Path = AUTHORITIES_DIRECTORY, scope_reference: str | None = None,
    report_directory: Path = REPORT_DIRECTORY,
) -> int:
    """Execute the policy and present results; returns the documented status (0, 1 or 2)."""
    stream = stream or sys.stdout
    if purpose == RunPurpose.DRAFT and not selected:
        print("Draft diagnostics: no ontology source selected; nothing validated.", file=stream)
        return 0
    try:
        policy = load_policy()
        modules = load_owned_modules()
        sources = assemble_sources(purpose, selected, modules, repository)
        comparisons = assemble_comparisons(purpose, selected, modules, repository)
        outcome = validate_sources(
            sources, purpose, policy, authorities_directory=authorities_directory, comparisons=comparisons,
            scope_reference=scope_reference,
        )
    except (AuthorityError, ContextError, InputError, PolicyDefinitionError) as error:
        print(f"POLICY_VALIDATION_ERROR ({type(error).__name__}): {error}", file=sys.stderr)
        return STATUS_ERROR
    written = write_report(outcome, report_directory, policy)
    present(outcome, github_actions=github_actions, stream=stream)
    print(f"Report: {written.summary_path}" + (f"; receipt: {written.receipt_path}" if written.receipt_path else ""), file=stream)
    return outcome.status


def present(outcome: ValidationOutcome, *, github_actions: bool, stream) -> None:
    print(f"Run purpose: {outcome.purpose.value}; policy {outcome.policy_identity}", file=stream)
    for module_iri, locator, digest in outcome.module_identities:
        print(f"  module {module_iri}\n    {locator} {digest}", file=stream)
    for name, digest in outcome.authority_identities:
        print(f"  authority {name} {digest}", file=stream)
    for module_iri, compared in outcome.comparisons:
        print(f"  comparison {module_iri}: {compared or 'unavailable (change obligations unevaluated)'}", file=stream)
    if outcome.scope_reference:
        print(f"Critical-fix scope: {outcome.scope_reference}; results limited to changed subjects and affected referrers.", file=stream)
    print(f"Targeted owned entities: {outcome.targeted_focus_count}", file=stream)
    if outcome.results:
        print(format_results(outcome.results), file=stream)
        if github_actions:
            for result in outcome.results:
                print(github_annotation("error" if result.blocks else "warning", result.requirement_id, result.focus_node, result.message), file=stream)
    print(
        f"{len(outcome.violations)} violation(s), {len(outcome.warnings)} warning(s); "
        f"{'qualifies activation' if outcome.qualifies else 'does not qualify activation'}"
        f"{'' if outcome.purpose.qualifies else ' (diagnostic purpose)'}.",
        file=stream,
    )
