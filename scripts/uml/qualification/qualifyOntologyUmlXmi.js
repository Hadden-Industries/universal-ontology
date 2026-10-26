import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, delimiter, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";
import { OWLManager } from "owlapi/apibinding";
import { StringDocumentSource } from "owlapi/io";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import dependencies from "../../../docs/uml/qualification-dependencies.v1.json" with { type: "json" };
import corpus from "../../../docs/uml/corpus.v1.json" with { type: "json" };
import { assertLosslessOntologyLoad } from "../../ontology/assertLosslessOntologyLoad.js";
import { verifyFullOntologyBuild } from "../../build/fullOntologyAssets.js";
import { exportOntologyUmlXmi } from "../exportOntologyUmlXmi.js";
import { recoverOntologyMetadata } from "../recoverOntologyMetadata.js";
import { compareOntologyMetadata } from "./compareOntologyMetadata.js";

const execute = promisify(execFile);
const repository = fileURLToPath(new URL("../../../", import.meta.url));
const script = fileURLToPath(import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const selectedDependency = async () =>
  JSON.parse(await readFile(join(repository, "package.json"), "utf8"))
    .devDependencies.owlapi;
const options = {
  worker: { type: "boolean" },
  acquire: { type: "boolean" },
  dependencies: { type: "string" },
  "corpus-root": { type: "string" },
  "existing-output-root": { type: "string" },
  output: { type: "string" },
  source: { type: "string" },
  "source-name": { type: "string" },
  "expected-sha256": { type: "string" },
  "existing-xmi": { type: "string" },
  "enforce-size-budget": { type: "boolean" },
};

async function run(executable, args, timeout = 180000) {
  return execute(executable, args, {
    cwd: repository,
    timeout,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

/** Acquire only explicit, pinned qualification inputs, never an environment install. */
async function prepareDependencies(directory, acquire) {
  const allowedHosts = new Set([
    "download.eclipse.org",
    "repo.maven.apache.org",
    "files.pythonhosted.org",
  ]);
  for (const [group, folder] of [
    ["java", "jars"],
    ["python", "wheels"],
  ]) {
    await mkdir(join(directory, folder), { recursive: true });
    if ((await lstat(join(directory, folder))).isSymbolicLink())
      throw new Error("Linked qualification dependency folder");
    for (const dependency of dependencies[group]) {
      if (
        basename(dependency.path) !== dependency.path ||
        !/^[a-f0-9]{64}$/u.test(dependency.sha256)
      )
        throw new Error("Invalid qualification dependency identity");
      const target = join(directory, folder, dependency.path);
      let bytes;
      try {
        const info = await lstat(target);
        if (
          !info.isFile() ||
          info.isSymbolicLink() ||
          info.size > 32 * 1024 * 1024
        )
          throw new Error("Invalid retained qualification dependency");
        bytes = await readFile(target);
      } catch (error) {
        if (error.code !== "ENOENT" || !acquire) throw error;
      }
      if (bytes === undefined) {
        const url = new URL(dependency.url);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          !allowedHosts.has(url.hostname)
        )
          throw new Error("Unapproved qualification dependency origin");
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
          redirect: "error",
        });
        if (!response.ok)
          throw new Error(
            `Qualification acquisition failed: ${response.status}`,
          );
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > 32 * 1024 * 1024)
            throw new Error("Qualification dependency exceeds its byte bound");
          chunks.push(chunk);
        }
        bytes = Buffer.concat(chunks);
        if (digest(bytes) !== dependency.sha256)
          throw new Error("Qualification dependency hash mismatch");
        await writeFile(target, bytes, { flag: "wx" });
      }
      if (digest(bytes) !== dependency.sha256)
        throw new Error(`Changed qualification dependency: ${dependency.path}`);
    }
  }
}

/** A fresh process releases its OWL/XML working memory before native readers run. */
async function worker(values) {
  const started = performance.now();
  const source = await readFile(resolve(values.source));
  const sourceSha256 = digest(source);
  if (values["expected-sha256"] && values["expected-sha256"] !== sourceSha256)
    throw new Error("Controlling corpus bytes differ from the frozen fixture");
  const dependency = await selectedDependency();
  let xmi;
  let recovery;
  if (values["existing-xmi"]) {
    xmi = await readFile(resolve(values["existing-xmi"]));
    recovery = await recoverOntologyMetadata(xmi);
    if (
      recovery.manifest.pairedOwlSha256 !== sourceSha256 ||
      recovery.manifest.owlapi !== dependency
    )
      throw new Error(
        "Existing XMI is not paired with this source and selected dependency",
      );
  } else {
    const manager = OWLManager.createOWLOntologyManager({
      behaviorProfileId: "normative-v1",
    });
    const loaded = await manager.loadOntologyGraphFromOntologyDocument(
      new StringDocumentSource(source.toString("utf8")),
      new OWLOntologyLoaderConfiguration({
        behaviorProfileId: "normative-v1",
        parsingMode: "strict",
        remoteImports: false,
        remoteJsonLdContexts: false,
        loadAnnotationAxioms: true,
      }),
    );
    assertLosslessOntologyLoad(loaded);
    const result = await exportOntologyUmlXmi({
      ontology: loaded.ontology,
      context: {
        pairedOwlSha256: sourceSha256,
        owlapi: dependency,
        ontologyPath: values["source-name"],
        behaviorProfileId: manager.getBehaviorProfileId(),
      },
    });
    xmi = Buffer.from(result.xmi);
    recovery = result.recovery;
    await writeFile(values.output, xmi, { flag: "wx" });
  }
  if (values["enforce-size-budget"] && xmi.length > source.length)
    throw new Error(
      `XMI size budget exceeded: ${xmi.length} bytes exceeds paired OWL ${source.length} bytes`,
    );
  const comparison = await compareOntologyMetadata({
    rdfXml: source,
    recovery,
    sourceName: values["source-name"],
    fallbackBaseIri: `https://haddenindustries.com/ontology/${values["source-name"]}`,
  });
  console.log(
    JSON.stringify({
      source: values["source-name"],
      sourceSha256,
      xmi: values["existing-xmi"] ?? values.output,
      xmiSha256: digest(xmi),
      xmiBytes: xmi.length,
      owlBytes: source.length,
      xmiToOwlRatio: xmi.length / source.length,
      semanticModelSha256: recovery.semanticModelSha256,
      counts: recovery.counts,
      comparison,
      seconds: (performance.now() - started) / 1000,
      rss: process.memoryUsage().rss,
    }),
  );
}

/** Qualify the eight frozen controls and any additional current build cohort. */
export async function qualifyOntologyUmlXmi(
  values,
  { repositoryDirectory = repository } = {},
) {
  if (
    !values.dependencies ||
    !values["corpus-root"] ||
    !values.output ||
    !values["existing-output-root"]
  )
    throw new Error(
      "Require --dependencies DIR --corpus-root DIR --output DIR --existing-output-root DIR; verified current build outputs are mandatory; --acquire explicitly permits pinned library downloads",
    );
  // A dated path is not a current-input identity. Reuse the publication owner's
  // authoritative source/producer/quartet verification before native qualification.
  const outputRoot = resolve(values["existing-output-root"]);
  const current = await verifyFullOntologyBuild({
    repositoryDirectory,
    outputDirectory: outputRoot,
  });
  const dependencyDirectory = resolve(values.dependencies);
  await mkdir(dependencyDirectory, { recursive: true });
  if ((await lstat(dependencyDirectory)).isSymbolicLink())
    throw new Error("Linked qualification dependency root");
  await prepareDependencies(dependencyDirectory, values.acquire);
  await mkdir(resolve(values.output), { recursive: true });
  const workspace = await mkdtemp(
    join(resolve(values.output), "uml-qualification-"),
  );
  const report = join(workspace, "qualification.jsonl");
  const java = await run("java", ["--version"], 10000);
  await appendFile(
    report,
    `${JSON.stringify({ kind: "context", dependency: await selectedDependency(), dependencyManifestSha256: digest(await readFile(new URL("../../../docs/uml/qualification-dependencies.v1.json", import.meta.url))), java: java.stdout.trim(), scope: "Native UML/profile validation plus independent core loading; no deployment or tool re-export claim" })}\n`,
  );
  const cases = corpus.fixtures.map((fixture) => ({
    ...fixture,
    source: join(resolve(values["corpus-root"]), fixture.path),
    expectedSha256: fixture.sha256,
  }));
  for (const candidate of current.candidates.filter((c) => c.imports.length)) {
    const path = `${candidate.outputPath}-full`;
    const source = join(outputRoot, path);
    const sourceSha256 = digest(await readFile(source));
    const controlling = cases.find(
      (c) => c.path === path && c.expectedSha256 === sourceSha256,
    );
    if (controlling) controlling.existingXmi = `${source}.xmi`;
    else
      cases.push({
        path,
        source,
        expectedSha256: sourceSha256,
        existingXmi: `${source}.xmi`,
        current: true,
      });
  }
  const classpath = dependencies.java
    .map((d) => join(dependencyDirectory, "jars", d.path))
    .join(delimiter);
  let failures = 0;
  for (const [index, candidate] of cases.entries()) {
    const file = join(workspace, `${index}-${digest(candidate.path)}.xmi`);
    let result;
    try {
      const args = [
        "--worker",
        "--enforce-size-budget",
        "--source",
        candidate.source,
        "--source-name",
        candidate.path,
        "--expected-sha256",
        candidate.expectedSha256,
        "--output",
        file,
      ];
      if (candidate.existingXmi)
        args.push("--existing-xmi", candidate.existingXmi);
      const measured = await run(process.execPath, [
        "--max-old-space-size=6144",
        script,
        ...args,
      ]);
      result = JSON.parse(measured.stdout);
      result.workerDiagnostics = measured.stderr;
      const native = await run("java", [
        "-Xmx4g",
        "--class-path",
        classpath,
        fileURLToPath(new URL("./ValidateUmlXmi.java", import.meta.url)),
        result.xmi,
      ]);
      result.nativeUml = JSON.parse(native.stdout);
      result.nativeDiagnostics = native.stderr;
      const core = await run(process.execPath, [
        join(repository, "scripts/runRepositoryPython.js"),
        fileURLToPath(new URL("./read_uml_core.py", import.meta.url)),
        "--dependencies",
        dependencyDirectory,
        "--xmi",
        result.xmi,
      ]);
      result.independentCore = JSON.parse(core.stdout);
      result.coreDiagnostics = core.stderr;
      result.status =
        !result.comparison.missing.length &&
        !result.comparison.extra.length &&
        result.nativeUml.instanceSpecifications ===
          result.independentCore.instanceSpecifications
          ? "passed"
          : "failed";
    } catch (error) {
      result = {
        ...result,
        status: "failed",
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
    if (result.status !== "passed") failures++;
    await appendFile(
      report,
      `${JSON.stringify({ kind: "fixture", ...result })}\n`,
    );
    console.log(
      JSON.stringify({ source: candidate.path, status: result.status, report }),
    );
  }
  console.log(
    JSON.stringify({
      status: failures ? "failed" : "passed",
      fixtures: cases.length,
      failures,
      report,
    }),
  );
  if (failures) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { values } = parseArgs({ options });
    if (values.worker) await worker(values);
    else await qualifyOntologyUmlXmi(values);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
