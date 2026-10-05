import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
  mkdtemp,
  readdir,
  lstat,
  open,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  resolve,
  relative,
  isAbsolute,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IRI, OWLOntologyLoaderConfiguration } from "owlapi/model";
import { OWLManager } from "owlapi/apibinding";
import { OntologyDocumentLoader } from "../ontology/ontologyDocumentLoader.js";
import { assertLosslessOntologyLoad } from "../ontology/assertLosslessOntologyLoad.js";
import { findOwlapiPackageRoot } from "../ontology/qualificationIdentity.js";
import { parseRdfXmlToQuads } from "../rdfXmlToJsonLd.js";
import { materializeImportClosure } from "../materializeImportClosure.js";
import { OasisXmlCatalogIRIMapper } from "../ontology/oasisXmlCatalogIRIMapper.js";
import { renderOntologyAssetsWithWorkers } from "./ontologyAssetWorkerPool.js";
import { inventorySourceTree, resolveOutputPath } from "./sourceInventory.js";

export const FULL_ONTOLOGY_CUTOFF = "20260714";
const PUBLIC_ROOT = "https://haddenindustries.com/ontology/";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const OWL = "http://www.w3.org/2002/07/owl#";
const SUFFIXES = ["-full", "-full.jsonld", "-full.csv"];
const offlineConfiguration = new OWLOntologyLoaderConfiguration({
  parsingMode: "strict",
  remoteImports: false,
  remoteJsonLdContexts: false,
  missingImportHandling: "throw",
  maxRetries: 0,
});
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const binarySort = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function context(options) {
  const repositoryDirectory = resolve(options.repositoryDirectory);
  return {
    repositoryDirectory,
    sourceDirectory: resolve(
      options.sourceDirectory ?? resolve(repositoryDirectory, "src"),
    ),
    outputDirectory: resolve(
      options.outputDirectory ?? resolve(repositoryDirectory, "dist"),
    ),
    reportDirectory: resolve(
      options.reportDirectory ??
        resolve(repositoryDirectory, ".sdlc/runtime/policy-reports"),
    ),
  };
}

function assertContained(root, path) {
  const rel = relative(root, path);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`))
    throw new Error(`Full ontology path escapes its owned root: ${path}`);
}

/** Reject links at every existing component, including the output root itself. */
async function containedPath(root, path) {
  assertContained(root, path);
  let current = path;
  for (;;) {
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`Linked full ontology path: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (relative(root, current) === "") break;
    const parent = dirname(current);
    if (parent === current)
      throw new Error(`Full ontology path did not reach its root: ${path}`);
    current = parent;
  }
  return path;
}

function validDate(name) {
  if (!/^\d{8}$/u.test(name)) return false;
  const year = Number(name.slice(0, 4)),
    month = Number(name.slice(4, 6)),
    day = Number(name.slice(6));
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Inspect RDF ontology headers without acquiring imports; OWL reconstruction follows during materialization. */
export async function discoverFullOntologyCandidates(options) {
  const ctx = context(options);
  const inventory = await inventorySourceTree({
    sourceDirectory: ctx.sourceDirectory,
  });
  const sources = [];
  for (const source of inventory.ontologySources) {
    const name = basename(source.outputPath);
    if (!/^\d{8}$/u.test(name)) continue;
    if (!validDate(name))
      throw new Error(`Invalid ontology release date: ${source.outputPath}`);
    await containedPath(ctx.sourceDirectory, source.sourcePath);
    const bytes = await readFile(source.sourcePath);
    if (bytes.length > offlineConfiguration.maxInputBytes)
      throw new Error("Ontology source exceeds its byte limit");
    const quads = await parseRdfXmlToQuads({
      rdfXml: bytes,
      sourceName: source.outputPath,
      fallbackBaseIri: new URL(
        `${dirname(source.outputPath).replaceAll("\\", "/")}/`,
        PUBLIC_ROOT,
      ).href,
    });
    const headers = quads.filter(
      (q) =>
        q.predicate.value === RDF_TYPE && q.object.value === `${OWL}Ontology`,
    );
    if (headers.length !== 1 || headers[0].subject.termType !== "NamedNode")
      throw new Error(
        `Expected one named ontology header: ${source.outputPath}`,
      );
    const header = headers[0].subject.value;
    const versions = quads.filter(
      (q) =>
        q.subject.value === header && q.predicate.value === `${OWL}versionIRI`,
    );
    const expectedIri = `${PUBLIC_ROOT}${source.outputPath}`;
    const publicIri = versions[0]?.object.value;
    if (
      versions.length !== 1 ||
      versions[0].object.termType !== "NamedNode" ||
      (name >= FULL_ONTOLOGY_CUTOFF &&
        (publicIri !== expectedIri ||
          header !==
            `${PUBLIC_ROOT}${dirname(source.outputPath).replaceAll("\\", "/")}/`))
    )
      throw new Error(
        `Ontology release identity mismatch: ${source.outputPath}`,
      );
    const importQuads = quads.filter(
      (q) => q.predicate.value === `${OWL}imports`,
    );
    if (
      importQuads.some(
        (q) => q.subject.value !== header || q.object.termType !== "NamedNode",
      )
    )
      throw new Error(`Invalid root import declaration: ${source.outputPath}`);
    if (name >= FULL_ONTOLOGY_CUTOFF && importQuads.length === 0) {
      const loader = new OntologyDocumentLoader();
      const manager = OWLManager.createOWLOntologyManager();
      const parsed = await manager.loadOntologyGraphFromOntologyDocument(
        await loader.loadRootDocument(source.sourcePath, {
          config: offlineConfiguration,
        }),
        offlineConfiguration,
      );
      assertLosslessOntologyLoad(parsed);
      if (
        parsed.ontology.getOntologyID().ontologyIRI?.value !== header ||
        parsed.ontology.getOntologyID().versionIRI?.value !== publicIri
      )
        throw new Error(
          `Native ontology identity mismatch: ${source.outputPath}`,
        );
    }
    sources.push({
      ...source,
      publicIri,
      ontologyIri: header,
      sha256: digest(bytes),
      imports: [...new Set(importQuads.map((q) => q.object.value))].sort(
        binarySort,
      ),
    });
  }
  sources.sort((a, b) => binarySort(a.outputPath, b.outputPath));
  return {
    sources,
    candidates: sources.filter(
      (source) => basename(source.outputPath) >= FULL_ONTOLOGY_CUTOFF,
    ),
  };
}

function candidateEvidence(candidates) {
  return candidates.map(
    ({ outputPath, sha256, publicIri, ontologyIri, imports }) => ({
      outputPath,
      sha256,
      publicIri,
      ontologyIri,
      imports,
      disposition: imports.length ? "generated" : "no-imports",
    }),
  );
}

async function producerEvidence() {
  const repository = fileURLToPath(new URL("../../", import.meta.url));
  const paths = [
    "package-lock.json",
    "docs/import-closure/contract.v1.json",
    "scripts/materializeImportClosure.js",
    "scripts/createFullVersions.js",
    "scripts/verifyFullOntologyBuild.js",
    "scripts/rdfXmlToJsonLd.js",
    "scripts/jsonLdToCsv.js",
    "src/ontologyCsv.js",
    "src/ontologyViewModel.js",
  ];
  for (const folder of ["scripts/build", "scripts/ontology"]) {
    for (const name of await readdir(resolve(repository, folder)))
      if (name.endsWith(".js")) paths.push(`${folder}/${name}`);
  }
  const files = {};
  for (const path of paths.sort(binarySort))
    files[path] = digest(await readFile(resolve(repository, path)));
  // CSV projection consumes a workspace package independently of OWLAPI.
  const projectionSource = dirname(
    fileURLToPath(import.meta.resolve("universal-ontology-projection-policy")),
  );
  const projectionData = dirname(
    fileURLToPath(
      import.meta
        .resolve("universal-ontology-projection-policy/field-property-history.v1.json"),
    ),
  );
  for (const [label, folder] of [
    ["src", projectionSource],
    ["data", projectionData],
  ])
    for (const name of (await readdir(folder)).sort(binarySort))
      if (name.endsWith(".js") || name.endsWith(".json"))
        files[`projection-policy/${label}/${name}`] = digest(
          await readFile(resolve(folder, name)),
        );
  const packageRoot = await findOwlapiPackageRoot();
  const packageFiles = {};
  async function capturePackage(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("Linked OWLAPI package input");
      if (entry.isDirectory()) await capturePackage(path);
      else if (entry.isFile())
        packageFiles[relative(packageRoot, path).split(sep).join("/")] = digest(
          await readFile(path),
        );
    }
  }
  await capturePackage(packageRoot);
  return { node: process.version, files, owlapi: packageFiles };
}

async function captureInput(ctx, path, inputs) {
  await containedPath(ctx.repositoryDirectory, path);
  const rel = relative(ctx.repositoryDirectory, path).split(sep).join("/");
  const sha256 = digest(await readFile(path));
  if (inputs[rel] && inputs[rel] !== sha256)
    throw new Error(`Full ontology input changed while building: ${rel}`);
  inputs[rel] = sha256;
}

/** Compose local-only release mappings with existing catalogs, rejecting competing identity bindings. */
export async function createLocalMapper(ctx, sources, inputs) {
  // Public callers can supply trailing separators or alternate Windows spelling.
  // Normalize before ancestor traversal so its root comparison always terminates.
  ctx = context(ctx);
  const releaseMap = new Map();
  for (const source of sources) {
    const document = pathToFileURL(source.sourcePath).href;
    if (
      releaseMap.has(source.publicIri) &&
      releaseMap.get(source.publicIri) !== document
    )
      throw new Error(
        `Conflicting local ontology release identity: ${source.publicIri}`,
      );
    releaseMap.set(source.publicIri, document);
  }
  const catalogs = [];
  for (const folder of [
    "core",
    "reference-data",
    "extended",
    "iso-iec11179-3",
  ]) {
    const path = resolve(ctx.repositoryDirectory, folder, "catalog-v001.xml");
    try {
      await lstat(path);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    catalogs.push(
      await OasisXmlCatalogIRIMapper.fromFile(path, {
        loadCatalogDocument: async (iri) => {
          const url = new URL(iri.value);
          if (url.protocol !== "file:")
            throw new Error("Remote catalog loading is disabled");
          const path = fileURLToPath(url);
          await captureInput(ctx, path, inputs);
          return new TextDecoder("utf-8", { fatal: true }).decode(
            await readFile(path),
          );
        },
      }),
    );
  }
  // The synchronous mapper chooses only identities already checked here. No remote document can be acquired.
  const mappings = new Map(releaseMap);
  const imports = new Set(sources.flatMap((s) => s.imports));
  // Catalogs may also resolve imports encountered in external vocabulary documents.
  return {
    getDocumentIRI(iri) {
      const direct = mappings.get(iri.value);
      const choices = catalogs
        .map((c) => c.getDocumentIRI(iri)?.value)
        .filter(Boolean);
      if (
        new Set(choices).size > 1 ||
        (direct && choices.some((value) => value !== direct))
      )
        throw new Error(`Conflicting local ontology mapping: ${iri.value}`);
      const selected = direct ?? choices[0];
      if (selected && !selected.startsWith("file:"))
        throw new Error(`Remote catalog target: ${iri.value}`);
      if (selected) {
        let path = fileURLToPath(selected);
        assertContained(ctx.repositoryDirectory, path);
        for (;;) {
          if (lstatSync(path).isSymbolicLink())
            throw new Error(`Linked local ontology input: ${path}`);
          if (relative(ctx.repositoryDirectory, path) === "") break;
          const parent = dirname(path);
          if (parent === path)
            throw new Error("Local ontology path did not reach its root");
          path = parent;
        }
      }
      if (!selected && imports.has(iri.value))
        throw new Error(`Missing local ontology input: ${iri.value}`);
      return selected ? IRI.create(selected) : undefined;
    },
  };
}

/** Generate all selected closures and alternate formats from captured current sources. */
export async function createFullOntologyAssets(options) {
  const ctx = context(options);
  const { sources, candidates } = await discoverFullOntologyCandidates(ctx);
  const inputs = {};
  for (const source of sources)
    inputs[
      relative(ctx.repositoryDirectory, source.sourcePath).split(sep).join("/")
    ] = source.sha256;
  const mapper = await createLocalMapper(ctx, sources, inputs);
  const workspace = await mkdtemp(
    resolve(tmpdir(), "uo-full-materialization-"),
  );
  const assets = new Map();
  try {
    for (const source of candidates.filter((s) => s.imports.length)) {
      const outputPath = `${source.outputPath}-full`;
      const temporary = resolveOutputPath(workspace, outputPath);
      await mkdir(dirname(temporary), { recursive: true });
      const observations = [];
      await materializeImportClosure({
        inputPath: source.sourcePath,
        outputPath: temporary,
        loaderConfiguration: offlineConfiguration,
        iriMapper: mapper,
        onDocument: (document) => observations.push(document),
      });
      for (const document of observations) {
        const path = fileURLToPath(document.resolved);
        await captureInput(ctx, path, inputs);
        const rel = relative(ctx.repositoryDirectory, path)
          .split(sep)
          .join("/");
        if (inputs[rel] !== document.sha256)
          throw new Error(`Consumed ontology input changed: ${rel}`);
      }
      const content = await readFile(temporary);
      assets.set(outputPath, content);
      const [rendered] = await renderOntologyAssetsWithWorkers({
        inputs: [
          {
            outputPath,
            content,
            size: content.length,
            fallbackBaseIRI: source.ontologyIri,
          },
        ],
        workerCount: 1,
      });
      assets.set(`${outputPath}.jsonld`, rendered.jsonLdContent);
      assets.set(`${outputPath}.csv`, rendered.csvContent);
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
  const receipt = {
    schemaVersion: 1,
    cutoff: FULL_ONTOLOGY_CUTOFF,
    candidates: candidateEvidence(candidates),
    inputs,
    producer: await producerEvidence(),
    outputs: [...assets].map(([path, bytes]) => ({
      path,
      size: bytes.length,
      sha256: digest(bytes),
    })),
    validation: {
      offlineClosure: true,
      jsonLdGraphEquivalent: true,
      csvProjection: true,
    },
  };
  await assertBuildInputs(ctx, receipt);
  return { assets, receipt };
}

async function assertBuildInputs(ctx, receipt) {
  const current = await discoverFullOntologyCandidates(ctx);
  if (
    JSON.stringify(candidateEvidence(current.candidates)) !==
    JSON.stringify(receipt.candidates)
  )
    throw new Error("Full ontology candidate inventory changed; rebuild");
  for (const source of current.sources) {
    const path = relative(ctx.repositoryDirectory, source.sourcePath)
      .split(sep)
      .join("/");
    if (receipt.inputs[path] !== source.sha256)
      throw new Error(
        `Missing or changed full ontology source binding: ${path}`,
      );
  }
  // Reconstruct the required local dependency bindings without trusting the receipt's input list.
  const requiredInputs = {};
  const mapper = await createLocalMapper(ctx, current.sources, requiredInputs);
  // Catalog vocabularies use several syntaxes, including Turtle. The native loader
  // owns format detection and import traversal; this read-only pass never writes outputs.
  for (const source of current.candidates.filter((s) => s.imports.length)) {
    const documents = [];
    const loader = new OntologyDocumentLoader({
      iriMapper: mapper,
      onDocument: (doc) => documents.push(doc),
    });
    const manager = OWLManager.createOWLOntologyManager({
      documentLoader: loader,
      iriMappers: [mapper],
    });
    const loaded = await manager.loadOntologyGraphFromOntologyDocument(
      await loader.loadRootDocument(source.sourcePath, {
        config: offlineConfiguration,
      }),
      offlineConfiguration,
    );
    assertLosslessOntologyLoad(loaded);
    for (const document of documents) {
      const path = fileURLToPath(document.resolved);
      await captureInput(ctx, path, requiredInputs);
      const relativePath = relative(ctx.repositoryDirectory, path)
        .split(sep)
        .join("/");
      if (requiredInputs[relativePath] !== document.sha256)
        throw new Error(`Consumed ontology input changed: ${relativePath}`);
    }
  }
  for (const [path, hash] of Object.entries(requiredInputs))
    if (receipt.inputs[path] !== hash)
      throw new Error(
        `Missing or changed full ontology dependency binding: ${path}`,
      );
  if (
    JSON.stringify(await producerEvidence()) !==
    JSON.stringify(receipt.producer)
  )
    throw new Error("Full ontology producer changed; rebuild");
  for (const [path, sha256] of Object.entries(receipt.inputs)) {
    const file = await containedPath(
      ctx.repositoryDirectory,
      resolveOutputPath(ctx.repositoryDirectory, path),
    );
    if (digest(await readFile(file)) !== sha256)
      throw new Error(`Full ontology input changed: ${path}; rebuild`);
  }
}

async function assertOutputs(ctx, receipt) {
  const required = receipt.candidates
    .flatMap((c) =>
      c.imports.length
        ? SUFFIXES.map((suffix) => `${c.outputPath}${suffix}`)
        : [],
    )
    .sort(binarySort);
  if (
    JSON.stringify(receipt.outputs.map((o) => o.path).sort(binarySort)) !==
    JSON.stringify(required)
  )
    throw new Error("Incomplete or duplicate full ontology output inventory");
  for (const output of receipt.outputs) {
    const bytes = await readFile(
      await containedPath(
        ctx.outputDirectory,
        resolveOutputPath(ctx.outputDirectory, output.path),
      ),
    );
    if (bytes.length !== output.size || digest(bytes) !== output.sha256)
      throw new Error(`Full ontology output changed: ${output.path}`);
  }
  for (const candidate of receipt.candidates.filter((c) => !c.imports.length))
    for (const suffix of SUFFIXES) {
      const path = await containedPath(
        ctx.outputDirectory,
        resolveOutputPath(
          ctx.outputDirectory,
          `${candidate.outputPath}${suffix}`,
        ),
      );
      try {
        await lstat(path);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      throw new Error(`Forbidden no-import full ontology output: ${path}`);
    }
}

/** Read-only publication admission recomputes source selection and checks all required and forbidden paths. */
export async function verifyFullOntologyBuild(options) {
  const ctx = context(options);
  const receipt = JSON.parse(
    await readFile(
      resolve(ctx.reportDirectory, "full-ontology-build.json"),
      "utf8",
    ),
  );
  if (
    receipt.schemaVersion !== 1 ||
    receipt.cutoff !== FULL_ONTOLOGY_CUTOFF ||
    !Array.isArray(receipt.candidates) ||
    !Array.isArray(receipt.outputs) ||
    !receipt.inputs ||
    !receipt.producer ||
    !receipt.validation?.offlineClosure ||
    !receipt.validation?.jsonLdGraphEquivalent ||
    !receipt.validation?.csvProjection
  )
    throw new Error("Unsupported or incomplete full ontology build receipt");
  await assertBuildInputs(ctx, receipt);
  await assertOutputs(ctx, receipt);
  return receipt;
}

/** Acquire exclusive generation ownership and invalidate old publication evidence before a build begins. */
export async function beginFullOntologyBuild(options) {
  const ctx = context(options);
  await containedPath(ctx.repositoryDirectory, ctx.reportDirectory);
  await containedPath(ctx.outputDirectory, ctx.outputDirectory);
  await mkdir(ctx.reportDirectory, { recursive: true });
  await mkdir(ctx.outputDirectory, { recursive: true });
  await containedPath(ctx.outputDirectory, ctx.outputDirectory);
  const lockPath = resolve(
    ctx.reportDirectory,
    `full-build-${digest(ctx.outputDirectory)}.lock`,
  );
  const lock = await open(lockPath, "wx");
  let previous;
  const receiptPath = resolve(ctx.reportDirectory, "full-ontology-build.json");
  try {
    await containedPath(ctx.repositoryDirectory, receiptPath);
    try {
      previous = JSON.parse(await readFile(receiptPath, "utf8"));
      const candidates = previous.candidates;
      const allowed = new Set(
        candidates
          ?.filter((c) => c.imports?.length)
          .flatMap((c) => SUFFIXES.map((s) => `${c.outputPath}${s}`)),
      );
      if (
        previous.schemaVersion !== 1 ||
        previous.cutoff !== FULL_ONTOLOGY_CUTOFF ||
        !Array.isArray(candidates) ||
        !Array.isArray(previous.outputs) ||
        candidates.some(
          (c) =>
            !Array.isArray(c.imports) ||
            !/^(?:universal|iso|iso-iec)\/(?:[^/]+\/)*\d{8}$/u.test(
              c.outputPath,
            ) ||
            !validDate(basename(c.outputPath)) ||
            basename(c.outputPath) < FULL_ONTOLOGY_CUTOFF,
        ) ||
        new Set(candidates.map((c) => c.outputPath)).size !==
          candidates.length ||
        previous.outputs.length !== allowed.size ||
        new Set(previous.outputs.map((o) => o.path)).size !==
          previous.outputs.length ||
        previous.outputs.some(
          (o) =>
            !allowed.has(o.path) ||
            !Number.isSafeInteger(o.size) ||
            o.size < 0 ||
            !/^[a-f0-9]{64}$/u.test(o.sha256),
        )
      )
        throw new Error("Invalid prior full ontology ownership receipt");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await rm(receiptPath, { force: true });
    return { ctx, previous, receiptPath, lock, lockPath };
  } catch (error) {
    await lock.close();
    await rm(lockPath, { force: true });
    throw error;
  }
}

/** Seal evidence only after emitted files exist; remove only hash-bound prior owned redundant counterparts. */
export async function completeFullOntologyBuild(state, receipt) {
  const { ctx, previous, receiptPath } = state;
  const currentOutputs = new Set(receipt.outputs.map((o) => o.path));
  const stalePaths = new Set([
    ...receipt.candidates
      .filter((c) => !c.imports.length)
      .flatMap((c) => SUFFIXES.map((suffix) => `${c.outputPath}${suffix}`)),
    ...(previous?.outputs ?? [])
      .filter((o) => !currentOutputs.has(o.path))
      .map((o) => o.path),
  ]);
  for (const outputPath of stalePaths) {
    const path = await containedPath(
      ctx.outputDirectory,
      resolveOutputPath(ctx.outputDirectory, outputPath),
    );
    let bytes;
    try {
      bytes = await readFile(path);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const owned = previous?.outputs?.find(
      (o) =>
        o.path === outputPath &&
        o.sha256 === digest(bytes) &&
        o.size === bytes.length,
    );
    if (!owned)
      throw new Error(
        `Unknown ownership of stale full ontology output: ${outputPath}`,
      );
    await rm(path);
  }
  await assertBuildInputs(ctx, receipt);
  await assertOutputs(ctx, receipt);
  const temporary = `${receiptPath}.pending`;
  let ownedTemporary = false;
  try {
    await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {
      flag: "wx",
    });
    ownedTemporary = true;
    await rename(temporary, receiptPath);
  } finally {
    if (ownedTemporary) await rm(temporary, { force: true });
  }
}

/** Check destination components before either writer can follow a linked output path. */
export async function checkFullOntologyOutputPaths(options, paths) {
  const ctx = context(options);
  for (const path of paths)
    await containedPath(
      ctx.outputDirectory,
      resolveOutputPath(ctx.outputDirectory, path),
    );
}

/** Release only the lock acquired by this invocation; partial outputs never acquire a valid receipt. */
export async function endFullOntologyBuild(state) {
  await state.lock.close();
  await rm(state.lockPath);
}
