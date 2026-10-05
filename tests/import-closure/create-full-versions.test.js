import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { createFullVersions } from "../../scripts/createFullVersions.js";
import {
  verifyFullOntologyBuild,
  beginFullOntologyBuild,
  endFullOntologyBuild,
  createLocalMapper,
  discoverFullOntologyCandidates,
} from "../../scripts/build/fullOntologyAssets.js";

const base = "https://haddenindustries.com/ontology/";
const rootPath = "universal/core/20260714";
const depPath = "iso/example/20260713";
function xml(path, imports = []) {
  return `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:owl="http://www.w3.org/2002/07/owl#"><owl:Ontology rdf:about="${base}${dirname(path)}/"><owl:versionIRI rdf:resource="${base}${path}"/>${imports.map((p) => `<owl:imports rdf:resource="${base}${p}"/>`).join("")}</owl:Ontology><owl:Class rdf:about="${base}${path}#Class"/></rdf:RDF>`;
}
async function fixture(action) {
  const repositoryDirectory = await mkdtemp(join(tmpdir(), "uo-full-batch-"));
  const outputDirectory = join(repositoryDirectory, "dist");
  const options = { repositoryDirectory, outputDirectory };
  const put = async (path, bytes) => {
    const file = join(repositoryDirectory, "src", path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
  };
  try {
    await put(rootPath, xml(rootPath, [depPath]));
    await put(depPath, xml(depPath));
    await action({ options, put, outputDirectory, repositoryDirectory });
  } finally {
    await rm(repositoryDirectory, { recursive: true, force: true });
  }
}

test("batch discovers the inclusive cutoff and includes a pre-cutoff dependency, with all three verified formats", async () =>
  fixture(async ({ options, outputDirectory }) => {
    const receipt = await createFullVersions(options);
    expect(receipt.outputs.map((o) => o.path)).toEqual([
      `${rootPath}-full`,
      `${rootPath}-full.jsonld`,
      `${rootPath}-full.csv`,
    ]);
    expect(
      await readFile(join(outputDirectory, `${rootPath}-full`), "utf8"),
    ).toContain(`${depPath}#Class`);
    await expect(verifyFullOntologyBuild(options)).resolves.toMatchObject({
      schemaVersion: 1,
    });
    await expect(
      access(join(outputDirectory, `${depPath}-full`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  }));

test("removing the last import invalidates the receipt and removes all owned stale counterparts", async () =>
  fixture(async ({ options, put, outputDirectory }) => {
    await createFullVersions(options);
    await put(rootPath, xml(rootPath));
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "inventory changed",
    );
    const receipt = await createFullVersions(options);
    expect(receipt.outputs).toEqual([]);
    for (const suffix of ["-full", "-full.jsonld", "-full.csv"])
      await expect(
        access(join(outputDirectory, `${rootPath}${suffix}`)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(verifyFullOntologyBuild(options)).resolves.toBeDefined();
    await put(rootPath, xml(rootPath, [depPath]));
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "inventory changed",
    );
    expect((await createFullVersions(options)).outputs).toHaveLength(3);
  }));

test("missing local imports stop generation and leave no usable receipt", async () =>
  fixture(async ({ options, put, repositoryDirectory }) => {
    await createFullVersions(options);
    await put(rootPath, xml(rootPath, ["iso/missing/20260912"]));
    await expect(createFullVersions(options)).rejects.toThrow(
      "Missing local ontology input",
    );
    await expect(
      access(
        join(
          repositoryDirectory,
          ".sdlc/runtime/policy-reports/full-ontology-build.json",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  }));

test("unknown stale outputs and tampered required files are refused", async () =>
  fixture(async ({ options, put, outputDirectory }) => {
    await createFullVersions(options);
    await writeFile(
      join(outputDirectory, `${rootPath}-full.jsonld`),
      "corrupt",
    );
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "output changed",
    );
    await put(rootPath, xml(rootPath));
    await expect(createFullVersions(options)).rejects.toThrow(
      "Unknown ownership",
    );
    expect(
      await readFile(join(outputDirectory, `${rootPath}-full.jsonld`), "utf8"),
    ).toBe("corrupt");
  }));

test("new families and skipped-source edits cannot hide behind an older receipt", async () =>
  fixture(async ({ options, put }) => {
    await createFullVersions(options);
    const path = "iso/new-family/20260912";
    await put(
      path,
      xml(path).replace(
        "</rdf:RDF>",
        "<!-- owl:imports is only a comment --></rdf:RDF>",
      ),
    );
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "inventory changed",
    );
    expect(
      (await createFullVersions(options)).candidates.find(
        (c) => c.outputPath === path,
      ).disposition,
    ).toBe("no-imports");
    await put(path, xml(path, [depPath]));
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "inventory changed",
    );
    expect((await createFullVersions(options)).outputs).toHaveLength(6);
  }));

test("invalid dates and malformed ontology inputs fail instead of becoming no-import skips", async () =>
  fixture(async ({ options, put }) => {
    await put("iso/example/20260230", xml("iso/example/20260230"));
    await expect(createFullVersions(options)).rejects.toThrow(
      "Invalid ontology release date",
    );
  }));

test("alternate namespace prefixes still select imports, while malformed XML cannot become a skip", async () =>
  fixture(async ({ options, put }) => {
    await put(
      rootPath,
      xml(rootPath, [depPath])
        .replaceAll("owl:", "o:")
        .replace("xmlns:owl=", "xmlns:o="),
    );
    expect((await createFullVersions(options)).outputs).toHaveLength(3);
    await put(rootPath, "<broken>");
    await expect(createFullVersions(options)).rejects.toThrow();
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow();
  }));

test("a concurrent producer cannot invalidate the lock owner's state", async () =>
  fixture(async ({ options }) => {
    const state = await beginFullOntologyBuild(options);
    try {
      await expect(beginFullOntologyBuild(options)).rejects.toMatchObject({
        code: "EEXIST",
      });
    } finally {
      await endFullOntologyBuild(state);
    }
    await expect(createFullVersions(options)).resolves.toBeDefined();
  }));

test("linked output directories are refused before any bytes outside dist are overwritten", async () =>
  fixture(async ({ options, repositoryDirectory, outputDirectory }) => {
    const outside = join(repositoryDirectory, "unowned");
    await mkdir(join(outside, "core"), { recursive: true });
    const sentinel = join(
      outside,
      `${rootPath.slice("universal/".length)}-full`,
    );
    await writeFile(sentinel, "preserve");
    await mkdir(outputDirectory, { recursive: true });
    await symlink(outside, join(outputDirectory, "universal"), "junction");
    await expect(createFullVersions(options)).rejects.toThrow(
      "Linked full ontology path",
    );
    expect(await readFile(sentinel, "utf8")).toBe("preserve");
  }));

test("removed releases clear only receipt-owned outputs and incomplete receipts are refused", async () =>
  fixture(async ({ options, repositoryDirectory, outputDirectory }) => {
    await createFullVersions(options);
    const receiptPath = join(
      repositoryDirectory,
      ".sdlc/runtime/policy-reports/full-ontology-build.json",
    );
    const original = await readFile(receiptPath, "utf8");
    const receipt = JSON.parse(original);
    receipt.inputs = {};
    await writeFile(receiptPath, JSON.stringify(receipt));
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow(
      "source binding",
    );
    await writeFile(receiptPath, original);
    await rm(join(repositoryDirectory, "src", rootPath));
    await expect(verifyFullOntologyBuild(options)).rejects.toThrow();
    expect((await createFullVersions(options)).outputs).toEqual([]);
    await expect(
      access(join(outputDirectory, `${rootPath}-full`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
  }));

test("invalid ownership receipts and existing pending evidence never delete unrelated files", async () =>
  fixture(async ({ options, repositoryDirectory, outputDirectory }) => {
    await createFullVersions(options);
    const report = join(
      repositoryDirectory,
      ".sdlc/runtime/policy-reports/full-ontology-build.json",
    );
    const original = await readFile(report, "utf8");
    const receipt = JSON.parse(original);
    const sentinel = join(outputDirectory, "sentinel.txt");
    await writeFile(sentinel, "preserve");
    receipt.outputs.push({
      path: "sentinel.txt",
      size: 8,
      sha256: createHash("sha256").update("preserve").digest("hex"),
    });
    await writeFile(report, JSON.stringify(receipt));
    await expect(createFullVersions(options)).rejects.toThrow(
      "ownership receipt",
    );
    expect(await readFile(sentinel, "utf8")).toBe("preserve");
    await writeFile(report, original);
    await writeFile(`${report}.pending`, "interruption evidence");
    await expect(createFullVersions(options)).rejects.toMatchObject({
      code: "EEXIST",
    });
    expect(await readFile(`${report}.pending`, "utf8")).toBe(
      "interruption evidence",
    );
  }));

test("linked report directories and ontology families are refused without touching their contents", async () =>
  fixture(async ({ options, repositoryDirectory }) => {
    const outside = join(repositoryDirectory, "unowned");
    await mkdir(outside);
    const sentinel = join(outside, "full-ontology-build.json");
    await writeFile(sentinel, "preserve");
    const reports = join(repositoryDirectory, "reports");
    await symlink(outside, reports, "junction");
    await expect(
      createFullVersions({ ...options, reportDirectory: reports }),
    ).rejects.toThrow("Linked full ontology path");
    expect(await readFile(sentinel, "utf8")).toBe("preserve");
    await symlink(
      outside,
      join(repositoryDirectory, "src/iso/linked-family"),
      "junction",
    );
    await expect(createFullVersions(options)).rejects.toThrow(
      "Linked ontology source path",
    );
  }));

test("mapper normalizes caller paths and rejects competing historical version identities", async () =>
  fixture(async ({ options, put, repositoryDirectory }) => {
    const { sources } = await discoverFullOntologyCandidates(options);
    const mapper = await createLocalMapper(
      { repositoryDirectory: `${repositoryDirectory}/` },
      sources,
      {},
    );
    expect(
      mapper.getDocumentIRI({ value: `${base}${depPath}` }).value,
    ).toContain("20260713");
    if (process.platform === "win32") {
      const caseVariant = await createLocalMapper(
        { repositoryDirectory: repositoryDirectory.toLowerCase() },
        sources,
        {},
      );
      expect(
        caseVariant.getDocumentIRI({ value: `${base}${depPath}` }).value,
      ).toContain("20260713");
    }
    const other = "iso/other/20260712";
    await put(
      other,
      xml(other).replace(`${base}${other}`, `${base}${depPath}`),
    );
    const duplicate = await discoverFullOntologyCandidates(options);
    await expect(
      createLocalMapper(options, duplicate.sources, {}),
    ).rejects.toThrow("Conflicting local ontology release identity");
  }));
