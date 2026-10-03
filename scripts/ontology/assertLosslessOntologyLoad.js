/** Require explicit no-loss evidence for every document in a manager load result. */
export function assertLosslessOntologyLoad(result) {
  if (!result?.ontology) throw new Error("Missing ontology load result");
  if (!Array.isArray(result.documents) || result.documents.length === 0)
    throw new Error("Missing document load evidence");
  for (const { context, ontology } of result.documents) {
    const reject = (message) => {
      throw Object.assign(new Error(message), {
        documentRole: ontology === result.ontology ? "root" : "imports",
        documentIRI: context?.documentIRI?.value,
      });
    };
    if (!context?.format || !Array.isArray(context.diagnostics))
      reject("Missing document format or diagnostics");
    // No diagnostic has yet been qualified as benign for this strict consumer.
    // New codes must be dispositioned explicitly rather than silently accepted.
    if (context.diagnostics.length)
      reject(
        `Unreconciled ontology diagnostics: ${context.diagnostics.map(({ code }) => code).join(", ")}`,
      );
    if (context.format.isRdf) {
      const metadata = context.format.getOntologyLoaderMetaData();
      if (!metadata) reject("Missing RDF parser metadata");
      if (metadata.getUnparsedTriples().length)
        reject("Ontology contains unparsed RDF statements");
      const guesses = metadata.getGuessedDeclarations();
      if (guesses.length) {
        if (!ontology?.getAxioms)
          reject("Missing axioms for inferred-role reconciliation");
        // RDFParserMetaData reports entity roles absent from explicit RDF type
        // declarations, including individuals used in ordinary class assertions.
        // A reported role is not itself an added Declaration axiom. Reject an
        // actual declaration for that undeclared role, not the role metadata.
        const declarations = new Set(
          [...ontology.getAxioms()]
            .filter((axiom) => axiom.kind === "OWLDeclarationAxiom")
            .map((axiom) =>
              JSON.stringify([axiom.entity.iri.value, axiom.entity.kind]),
            ),
        );
        for (const { iri, entityType } of guesses) {
          if (
            !iri?.value ||
            !["OWLClass", "OWLDatatype", "OWLNamedIndividual"].includes(
              entityType,
            )
          )
            reject("Unqualified inferred entity role");
          if (declarations.has(JSON.stringify([iri.value, entityType])))
            reject("Ontology contains a synthesized declaration axiom");
        }
      }
    }
  }
}
