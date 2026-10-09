import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { OWLManager } from "owlapi/apibinding";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import { OWLDocumentFormats, RDFXMLDocumentFormat } from "owlapi/formats";
import {
  OasisXmlCatalogIRIMapper,
  findCatalog,
} from "./ontology/oasisXmlCatalogIRIMapper.js";
import { OntologyDocumentLoader } from "./ontology/ontologyDocumentLoader.js";
import { collapseImportsClosure } from "./ontology/collapseImportsClosure.js";
import { writeVerifiedOntology } from "./ontology/atomicOntologyWriter.js";
import { assertLosslessOntologyLoad } from "./ontology/assertLosslessOntologyLoad.js";

const generationConfiguration = new OWLOntologyLoaderConfiguration({
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

/** Resolve a complete source closure and atomically publish its verified structural union. */
export async function materializeImportClosure({
  inputPath,
  outputPath,
  catalogPath,
  format = "rdfxml",
  onDocument,
  loaderConfiguration = generationConfiguration,
  iriMapper,
}) {
  if (
    !inputPath ||
    !outputPath ||
    resolve(inputPath) === resolve(outputPath) ||
    !["rdfxml", "functional"].includes(format)
  )
    throw failure(
      "usage",
      new Error(
        "Provide distinct INPUT OUTPUT paths and --format rdfxml|functional",
      ),
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
  const outputManager = OWLManager.createOWLOntologyManager();
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
  await writeVerifiedOntology({
    ontology,
    manager: outputManager,
    format: outputFormat,
    outputPath,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  let options;
  try {
    const { values, positionals } = parseArgs({
      options: { catalog: { type: "string" }, format: { type: "string" } },
      allowPositionals: true,
    });
    if (positionals.length !== 2)
      throw new Error(
        "Usage: node scripts/materializeImportClosure.js INPUT OUTPUT [--catalog PATH] [--format rdfxml|functional]",
      );
    options = {
      inputPath: positionals[0],
      outputPath: positionals[1],
      catalogPath: values.catalog,
      format: values.format,
    };
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
  if (options) {
    try {
      await materializeImportClosure(options);
    } catch (error) {
      console.error(error.message);
      process.exitCode =
        {
          usage: 2,
          root: 3,
          imports: 4,
          serialization: 5,
          verification: 6,
          publication: 7,
        }[error.stage] ?? 4;
    }
  }
}
