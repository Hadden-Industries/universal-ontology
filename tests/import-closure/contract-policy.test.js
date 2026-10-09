import { expect, test } from "@jest/globals";
import { readFile } from "node:fs/promises";

const contractURL = new URL(
  "../../docs/import-closure/contract.v1.json",
  import.meta.url,
);

test("locks the approved standalone import-closure policy", async () => {
  const contract = JSON.parse(await readFile(contractURL, "utf8"));

  expect(contract).toEqual({
    schemaVersion: 1,
    owlapiBoundary: {
      packageName: "@hadden-industries/owlapi",
      dependencyName: "owlapi",
      sourceRepository: "https://github.com/Hadden-Industries/owlapi",
      sourceCommit: "e15320d6438b27c5aaa7aa9302b6919749873ec9",
      exactVersion: "0.1.0-rc.1",
      dependencySpecifier:
        "git+https://github.com/Hadden-Industries/owlapi.git#e15320d6438b27c5aaa7aa9302b6919749873ec9",
      dependencySection: "devDependencies",
      qualificationPrerequisite:
        "upstream-capabilities-and-exact-git-source-package-verification",
      productionPrerequisite: "exact-artifact-and-complete-consumer-acceptance",
      releaseCandidateProductionUse:
        "allowed-after-exact-artifact-and-consumer-acceptance",
      publicSubpathAuthority: "public-api-surface-registry",
      publicSubpathRule: "exact-approved-org.semanticweb.owlapi-package",
      publicBindingSourceOwnership:
        "single-canonical-definition-in-java-shaped-namespace",
      privateImplementationLayout: "cohesive-non-mirrored-internal",
      requiredPublicSpecifiers: [
        "owlapi/apibinding",
        "owlapi/model",
        "owlapi/io",
        "owlapi/formats",
        "owlapi/util",
      ],
      storageAccess: "OWLOntologyManager.saveOntology",
      concreteStorerConstructors: "not-required",
      unregisteredOrInternalImports: "forbid",
      localSourceTreeOrUnpinnedDependency: "forbid",
    },
    axiomPolicy: "union-direct-axioms-of-complete-imports-closure",
    rootOntologyID: "preserve",
    rootOntologyAnnotations: "preserve",
    importedOntologyAnnotations: "drop",
    importsDeclarations: "drop-all",
    anonymousIndividuals: "standardize-apart-by-source",
    inferredOrSyntheticAxioms: "forbid",
    literalMutation: "forbid",
    ignoredInput: "fatal",
    sidecars: "forbid",
    verification: "strict-offline-structural-round-trip-before-publish",
  });
});
