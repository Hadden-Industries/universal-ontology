import { expect, test } from "@jest/globals";
import { OWLManager } from "owlapi/apibinding";
import { AddImport, IRI } from "owlapi/model";
import { readFileSync } from "node:fs";
const register = JSON.parse(
  readFileSync(
    new URL("../../docs/uml/mapping-register.v1.json", import.meta.url),
    "utf8",
  ),
);
import { exportOntologyUmlXmi } from "../../scripts/uml/exportOntologyUmlXmi.js";
import { loadMetadataWitness, witnessContext } from "./metadataWitness.js";

test.each(register.rows.filter((r) => !r.id.startsWith("S")))(
  "register-$id retains its exact source role and values",
  async (row) => {
    const manager = OWLManager.createOWLOntologyManager({
      behaviorProfileId: "normative-v1",
    });
    const f = manager.getOWLDataFactory();
    const iri = (value) => IRI.create(value);
    const ontology = manager.createOntology(
      f.getOWLOntologyID(
        iri("urn:register"),
        row.id === "M27" ? iri("urn:register:version") : undefined,
      ),
    );
    if (row.id === "H06") {
      manager.applyChange(
        new AddImport(
          ontology,
          f.getOWLImportsDeclaration(iri("urn:absent:import")),
        ),
      );
      await expect(
        exportOntologyUmlXmi({ ontology, context: witnessContext }),
      ).rejects.toThrow("collapsed");
      return;
    }
    const property = row.id.startsWith("D")
      ? f.getOWLDataProperty(iri(row.iri))
      : f.getOWLAnnotationProperty(iri(row.iri));
    if (row.id === "E01")
      manager.addAxiom(ontology, f.getOWLDeclarationAxiom(property));
    else if (row.id !== "M27") {
      const literal = f.getOWLLiteral(
        `é\r\n${row.id}`,
        f.getOWLDatatype(iri("urn:unseen:datatype")),
      );
      if (row.id.startsWith("D"))
        manager.addAxiom(
          ontology,
          f.getOWLDataPropertyAssertionAxiom(
            property,
            f.getOWLNamedIndividual(iri("urn:subject")),
            literal,
          ),
        );
      else {
        manager.addAxiom(
          ontology,
          f.getOWLAnnotationAssertionAxiom(
            property,
            iri("urn:subject"),
            literal,
          ),
        );
        manager.addAxiom(
          ontology,
          f.getOWLAnnotationAssertionAxiom(
            property,
            iri("urn:subject"),
            iri("urn:iri:value"),
          ),
        );
      }
    }
    const { recovery } = await exportOntologyUmlXmi({
      ontology,
      context: witnessContext,
    });
    const nodes = new Map(recovery.records.map((r) => [r.id, r]));
    const scalar = (node, field) => node?.fields[field]?.[0]?.scalar;
    const child = (node, field) =>
      nodes.get(node?.fields[field]?.[0]?.reference);
    const kind = (node) => scalar(node, "kind");
    const iriValue = (node) =>
      scalar(kind(node) === "IRI" ? node : child(node, "iri"), "value")?.slice(
        7,
      );
    if (row.id === "M27") {
      const id = recovery.records.find((r) => kind(r) === "OWLOntologyID");
      expect(iriValue(child(id, "versionIRI"))).toBe("urn:register:version");
    } else if (row.id === "E01") {
      const declaration = recovery.records.find(
        (r) => kind(r) === "OWLDeclarationAxiom",
      );
      expect(iriValue(child(declaration, "entity"))).toBe(row.iri);
      expect(
        recovery.records.some((r) => kind(r) === "OWLAnnotationAssertionAxiom"),
      ).toBe(false);
    } else {
      const assertions = recovery.records.filter(
        (r) =>
          kind(r) ===
          (row.id.startsWith("D")
            ? "OWLDataPropertyAssertionAxiom"
            : "OWLAnnotationAssertionAxiom"),
      );
      expect(assertions).toHaveLength(row.id.startsWith("D") ? 1 : 2);
      expect(
        assertions.every(
          (r) =>
            iriValue(child(r, "property")) === row.iri &&
            iriValue(child(r, "subject")) === "urn:subject",
        ),
      ).toBe(true);
      expect(recovery.literals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lexical: `é\r\n${row.id}`,
            datatype: "urn:unseen:datatype",
          }),
        ]),
      );
      if (!row.id.startsWith("D"))
        expect(
          assertions.some(
            (r) => iriValue(child(r, "value")) === "urn:iri:value",
          ),
        ).toBe(true);
    }
  },
);

test("historical structural positives remain distinct native contexts", async () => {
  const ontology = await loadMetadataWitness(`Ontology(<urn:historical>
    EquivalentObjectProperties(<urn:p> <urn:q>)
    DifferentIndividuals(<urn:a> <urn:b>) SameIndividual(<urn:b> <urn:c>)
  )`);
  const { recovery } = await exportOntologyUmlXmi({
    ontology,
    context: witnessContext,
  });
  expect(recovery.records.map((r) => r.fields.kind?.[0]?.scalar)).toEqual(
    expect.arrayContaining([
      "OWLEquivalentObjectPropertiesAxiom",
      "OWLDifferentIndividualsAxiom",
      "OWLSameIndividualAxiom",
    ]),
  );
});
