import { AddOntologyAnnotation, SetOntologyID } from "owlapi/model";
import {
  OWLOntologyImportsClosureSetProvider,
  OWLOntologyMerger,
} from "owlapi/util";

function equalStructuralSets(left, right) {
  const keys = new Set([...left].map((value) => value.structuralKey()));
  const other = new Set([...right].map((value) => value.structuralKey()));
  return keys.size === other.size && [...keys].every((key) => other.has(key));
}

/** Materialize direct closure axioms while attributing ontology metadata only to the root. */
export function collapseImportsClosure({
  inputManager,
  outputManager,
  rootOntology,
}) {
  const provider = new OWLOntologyImportsClosureSetProvider(
    inputManager,
    rootOntology,
  );
  const merger = new OWLOntologyMerger(provider);
  const rootID = rootOntology.getOntologyID();
  const collapsed = merger.createMergedOntology(
    outputManager,
    rootID.ontologyIRI,
  );
  outputManager.applyChange(new SetOntologyID(collapsed, rootID));
  outputManager.applyChanges(
    [...rootOntology.getAnnotations()].map(
      (annotation) => new AddOntologyAnnotation(collapsed, annotation),
    ),
  );
  const axioms = [...inputManager.getImportsClosure(rootOntology)].flatMap(
    (ontology) => [...ontology.getAxioms()],
  );
  if (
    !collapsed.getOntologyID().equals(rootID) ||
    collapsed.getImportsDeclarations().size !== 0 ||
    !equalStructuralSets(
      collapsed.getAnnotations(),
      rootOntology.getAnnotations(),
    ) ||
    !equalStructuralSets(collapsed.getAxioms(), axioms)
  ) {
    throw new Error(
      "Collapsed ontology violates the root identity, metadata, imports or axiom-union contract",
    );
  }
  return collapsed;
}
