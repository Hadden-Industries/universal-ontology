import { OWLManager } from "owlapi/apibinding";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import { OWLDocumentFormats, RDFXMLDocumentFormat } from "owlapi/formats";
import {
  OasisXmlCatalogIRIMapper,
  findCatalog,
} from "./oasisXmlCatalogIRIMapper.js";
import { OntologyDocumentLoader } from "./ontologyDocumentLoader.js";
import { collapseImportsClosure } from "./collapseImportsClosure.js";
import { assertLosslessOntologyLoad } from "./assertLosslessOntologyLoad.js";

const generationConfiguration = new OWLOntologyLoaderConfiguration({
  behaviorProfileId: "normative-v1",
  parsingMode: "strict",
  loadAnnotationAxioms: true,
  remoteImports: true,
  remoteJsonLdContexts: true,
  missingImportHandling: "throw",
  rdfDatasetGraphPolicy: "requireSingleGraph",
  maxRedirects: 20,
  maxRetries: 3,
  collectWarnings: true,
  sourceLocations: true,
});

function failure(stage, cause) {
  return Object.assign(
    new Error(`Ontology ${stage} failed: ${cause.message}`, { cause }),
    { stage },
  );
}

/** Load and collapse once, returning the owning model without publishing or reloading it. */
export async function loadCollapsedOntology({
  inputPath,
  catalogPath,
  format = "rdfxml",
  onDocument,
  loaderConfiguration = generationConfiguration,
  iriMapper,
}) {
  if (!inputPath || !["rdfxml", "functional"].includes(format))
    throw failure(
      "usage",
      new Error("Provide INPUT and --format rdfxml|functional"),
    );
  const catalogLoader = new OntologyDocumentLoader({ onDocument });
  let mapper;
  try {
    const selectedCatalog = catalogPath ?? (await findCatalog(inputPath));
    mapper = selectedCatalog
      ? await OasisXmlCatalogIRIMapper.fromFile(selectedCatalog, {
          loadCatalogDocument: (iri) =>
            catalogLoader.loadCatalogDocument(iri, {
              config: loaderConfiguration,
            }),
        })
      : undefined;
  } catch (cause) {
    throw failure("imports", cause);
  }
  const loader = new OntologyDocumentLoader({
    iriMapper: iriMapper ?? mapper,
    onDocument,
  });
  let resolvingImports = false;
  const inputManager = OWLManager.createOWLOntologyManager({
    behaviorProfileId: "normative-v1",
    iriMappers: iriMapper ? [iriMapper] : mapper ? [mapper] : [],
    documentLoader: {
      load(...args) {
        // The manager requests imports only after parsing the root document.
        resolvingImports = true;
        return loader.load(...args);
      },
    },
  });
  let rootOntology;
  try {
    const source = await loader.loadRootDocument(inputPath, {
      config: loaderConfiguration,
    });
    const result = await inputManager.loadOntologyGraphFromOntologyDocument(
      source,
      loaderConfiguration,
    );
    assertLosslessOntologyLoad(result);
    rootOntology = result.ontology;
  } catch (cause) {
    throw failure(
      cause.documentRole ?? (resolvingImports ? "imports" : "root"),
      cause,
    );
  }
  const outputManager = OWLManager.createOWLOntologyManager({
    behaviorProfileId: "normative-v1",
  });
  const ontology = collapseImportsClosure({
    inputManager,
    outputManager,
    rootOntology,
  });
  let outputFormat = OWLDocumentFormats.FUNCTIONAL;
  try {
    if (format === "rdfxml") {
      outputFormat = new RDFXMLDocumentFormat();
      const rootFormat = inputManager.getOntologyFormat(rootOntology);
      if (rootFormat instanceof RDFXMLDocumentFormat)
        outputFormat.copyPrefixesFrom(rootFormat);
    }
  } catch (cause) {
    throw failure("serialization", cause);
  }
  return { ontology, manager: outputManager, format: outputFormat };
}
