import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { OWLDocumentFormats } from "owlapi/formats";
import { StringDocumentSource, StringDocumentTarget } from "owlapi/io";
import { verifyStandaloneOntology } from "../../scripts/ontology/verifyStandaloneOntology.js";

test.each([OWLDocumentFormats.FUNCTIONAL, OWLDocumentFormats.RDF_XML])(
  "strict offline verification round-trips %s",
  async (format) => {
    const manager = OWLManager.createOWLOntologyManager();
    const expectedOntology = await manager.loadOntologyFromOntologyDocument(
      new StringDocumentSource(
        "Ontology(<urn:root> Declaration(Class(<urn:C>)))",
      ),
    );
    const target = new StringDocumentTarget();
    await manager.saveOntology(expectedOntology, format, target);
    const verified = await verifyStandaloneOntology({
      expectedOntology,
      serializedText: target.toString(),
      format,
    });
    expect(verified.getAxioms().size).toBe(1);
  },
);
test.each([
  "Ontology(<urn:root>)",
  "Ontology(<urn:other> Declaration(Class(<urn:C>)))",
  "Ontology(<urn:root> Declaration(Class(<urn:C>)) Declaration(Class(<urn:D>)))",
  "Ontology(<urn:root> Import(<https://example.test/forbidden>) Declaration(Class(<urn:C>)))",
  'Ontology(<urn:root> Annotation(<urn:label> "added") Declaration(Class(<urn:C>)))',
])("rejects mutated artifact %s", async (serializedText) => {
  const expectedOntology =
    await OWLManager.createOWLOntologyManager().loadOntologyFromOntologyDocument(
      new StringDocumentSource(
        "Ontology(<urn:root> Declaration(Class(<urn:C>)))",
      ),
    );
  await expect(
    verifyStandaloneOntology({
      expectedOntology,
      serializedText,
      format: OWLDocumentFormats.FUNCTIONAL,
    }),
  ).rejects.toThrow();
});
