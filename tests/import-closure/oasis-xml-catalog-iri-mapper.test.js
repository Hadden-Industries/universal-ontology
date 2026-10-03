import { afterEach, expect, test } from "@jest/globals";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IRI } from "owlapi/model";
import {
  OasisXmlCatalogIRIMapper,
  findCatalog,
} from "../../scripts/ontology/oasisXmlCatalogIRIMapper.js";

const temporaryDirectories = [];
const namespace = "urn:oasis:names:tc:entity:xmlns:xml:catalog";
async function catalogs(entries) {
  const directory = await mkdtemp(join(tmpdir(), "uo-catalog-test-"));
  temporaryDirectories.push(directory);
  for (const [name, xml] of Object.entries(entries)) {
    await writeFile(
      join(directory, name),
      `<catalog xmlns="${namespace}">${xml}</catalog>`,
    );
  }
  return directory;
}
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("exact mappings precede rewrites and inherit nested xml:base", async () => {
  const directory = await catalogs({
    "catalog.xml": `
    <rewriteURI uriStartString="https://example.test/" rewritePrefix="fallback/"/>
    <group xml:base="nested/"><group xml:base="deeper/">
      <uri name="https://example.test/exact" uri="result.owl"/>
    </group></group>
    <rewriteURI uriStartString="https://example.test/long/" rewritePrefix="specific/"/>
  `,
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(
    mapper.getDocumentIRI(IRI.create("https://example.test/exact")).value,
  ).toBe(pathToFileURL(join(directory, "nested/deeper/result.owl")).href);
  expect(
    mapper.getDocumentIRI(IRI.create("https://example.test/long/item")).value,
  ).toBe(pathToFileURL(join(directory, "specific/item")).href);
  expect(mapper.getDocumentIRI(IRI.create("urn:missing"))).toBeUndefined();
});

test("delegation tries every matching catalog longest first, with stable ties", async () => {
  const directory = await catalogs({
    "catalog.xml": `<delegateURI uriStartString="urn:example:" catalog="short.xml"/>
      <delegateURI uriStartString="urn:example:long:" catalog="miss.xml"/>
      <delegateURI uriStartString="urn:example:" catalog="tie.xml"/>`,
    "short.xml": `<uri name="urn:example:long:item" uri="expected.owl"/>`,
    "miss.xml": "",
    "tie.xml": `<uri name="urn:example:long:item" uri="wrong.owl"/>`,
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(mapper.getDocumentIRI(IRI.create("urn:example:long:item")).value).toBe(
    pathToFileURL(join(directory, "expected.owl")).href,
  );
});

test("nested delegation abandons the previous list and its next catalogs", async () => {
  const directory = await catalogs({
    "catalog.xml": `<delegateURI uriStartString="urn:" catalog="nested.xml"/><delegateURI uriStartString="urn:" catalog="fallback.xml"/><nextCatalog catalog="fallback.xml"/>`,
    "nested.xml": `<delegateURI uriStartString="urn:" catalog="empty.xml"/><nextCatalog catalog="fallback.xml"/>`,
    "empty.xml": "",
    "fallback.xml": `<uri name="urn:item" uri="wrong.owl"/>`,
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(mapper.getDocumentIRI(IRI.create("urn:item"))).toBeUndefined();
});

test("nextCatalog entries are searched in document order", async () => {
  const directory = await catalogs({
    "catalog.xml": `<nextCatalog catalog="empty.xml"/><nextCatalog catalog="match.xml"/>`,
    "empty.xml": "",
    "match.xml": `<uri name="urn:item" uri="expected.owl"/>`,
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(mapper.getDocumentIRI(IRI.create("urn:item")).value).toBe(
    pathToFileURL(join(directory, "expected.owl")).href,
  );
});

test.each([
  [
    '<uri name="urn:item" uri="first.owl"/><uri name="urn:item" uri="second.owl"/>',
    /conflicting/i,
  ],
  ['<uri name="urn:item" uri="http://[invalid"/>', /URI|URL/i],
  ['<uri name="urn:item"/>', /uri/i],
  ['<uriSuffix uriSuffix=".owl" uri="other.owl"/>', /unsupported/i],
  ["<group>", /XML|catalog/i],
])("rejects invalid catalog content: %s", async (xml, failure) => {
  const directory = await catalogs({ "catalog.xml": xml });
  await expect(
    OasisXmlCatalogIRIMapper.fromFile(join(directory, "catalog.xml")),
  ).rejects.toThrow(failure);
});

test("catalog cycles report the complete chain", async () => {
  const directory = await catalogs({
    "a.xml": '<nextCatalog catalog="b.xml"/>',
    "b.xml": '<nextCatalog catalog="a.xml"/>',
  });
  await expect(
    OasisXmlCatalogIRIMapper.fromFile(join(directory, "a.xml")),
  ).rejects.toThrow(/a\.xml.*b\.xml.*a\.xml/);
});

test("normalizes Unicode and spaces without URL host normalization", async () => {
  const directory = await catalogs({
    "catalog.xml":
      '<uri name="https://EXAMPLE.test/café item" uri="expected.owl"/>',
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(
    mapper.getDocumentIRI(IRI.create("https://EXAMPLE.test/caf%C3%A9%20item"))
      .value,
  ).toBe(pathToFileURL(join(directory, "expected.owl")).href);
  expect(
    mapper.getDocumentIRI(IRI.create("https://example.test/caf%C3%A9%20item")),
  ).toBeUndefined();
});

test("foreign subtrees and public/system entries do not provide URI mappings", async () => {
  const directory = await catalogs({
    "catalog.xml":
      '<other xmlns="urn:other"><uri xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog" name="urn:item" uri="wrong.owl"/></other><system systemId="urn:item" uri="wrong.owl"/>',
  });
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
  );
  expect(mapper.getDocumentIRI(IRI.create("urn:item"))).toBeUndefined();
});

test("uses the injected loader for remote delegated catalogs", async () => {
  const directory = await catalogs({
    "catalog.xml": '<nextCatalog catalog="https://example.test/catalog.xml"/>',
  });
  const seen = [];
  const mapper = await OasisXmlCatalogIRIMapper.fromFile(
    join(directory, "catalog.xml"),
    {
      loadCatalogDocument: async (iri) => {
        seen.push(iri.value);
        return iri.value.startsWith("file:")
          ? readFile(new URL(iri.value), "utf8")
          : `<catalog xmlns="${namespace}"><uri name="urn:item" uri="result.owl"/></catalog>`;
      },
    },
  );
  expect(mapper.getDocumentIRI(IRI.create("urn:item")).value).toBe(
    "https://example.test/result.owl",
  );
  expect(seen).toHaveLength(2);
});

test("findCatalog searches input parents", async () => {
  const directory = await catalogs({ "catalog-v001.xml": "" });
  await mkdir(join(directory, "nested"));
  expect(await findCatalog(join(directory, "nested/root.owl"))).toBe(
    join(directory, "catalog-v001.xml"),
  );
});

test.each(["iso-iec11179-3", "reference-data", "core", "extended"])(
  "loads repository catalog %s with existing local mappings",
  async (family) => {
    const path = fileURLToPath(
      new URL(`../../${family}/catalog-v001.xml`, import.meta.url),
    );
    const mapper = await OasisXmlCatalogIRIMapper.fromFile(path);
    const xml = await readFile(path, "utf8");
    const names = [...xml.matchAll(/\bname="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const resolved = mapper.getDocumentIRI(IRI.create(name)).value;
      if (resolved.startsWith("file:")) await access(fileURLToPath(resolved));
      else expect(new URL(resolved).protocol).toMatch(/^https?:$/);
    }
    expect(dirname(path)).toContain(family);
  },
);
