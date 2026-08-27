import { Buffer } from "node:buffer";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  convertJsonLdToCsv,
  renderOntologyCsvFromJsonLd,
} from "../scripts/jsonLdToCsv.js";

const JSON_LD_DOCUMENT = [
  {
    "@id": "https://haddenindustries.com/ontology/universal/core/",
    "@type": ["http://www.w3.org/2002/07/owl#Ontology"],
  },
  {
    "@id": "https://haddenindustries.com/ontology/universal/core/Thing",
    "@type": ["http://www.w3.org/2002/07/owl#Class"],
    "http://purl.org/dc/terms/identifier": [
      {
        "@value": "urn:uuid:6cc43e8b-3eb3-43f1-80bd-b643a27f1c32",
      },
    ],
    "http://www.w3.org/2004/02/skos/core#prefLabel": [
      {
        "@language": "en",
        "@value": "Thing",
      },
    ],
  },
];

const EXPECTED_CSV = [
  "Entity Type,UUID,URI,Preferred Label,Definition,Sources,References,Creator,Created At,Modified At,Superclasses,Class of Named Individual",
  "Class,6cc43e8b-3eb3-43f1-80bd-b643a27f1c32,https://haddenindustries.com/ontology/universal/core/Thing,Thing,,,,,,,,",
].join("\n");

test("renders ontology JSON-LD as CSV bytes", () => {
  const rendered = renderOntologyCsvFromJsonLd(JSON_LD_DOCUMENT);

  expect(rendered.rowCount).toBe(1);
  expect(rendered.content).toEqual(Buffer.from(EXPECTED_CSV, "utf8"));
});

test("renders legacy fields when the ontology path predates its migration", () => {
  const document = structuredClone(JSON_LD_DOCUMENT);
  const entity = document[1];

  delete entity["http://www.w3.org/2004/02/skos/core#prefLabel"];
  entity["http://purl.org/dc/terms/title"] = [
    { "@language": "en", "@value": "Legacy Thing" },
  ];

  const rendered = renderOntologyCsvFromJsonLd(document, {
    ontologyPath: "universal/core/20260610",
  });

  expect(rendered.content.toString("utf8")).toContain(",Legacy Thing,,,,,,,");
});

test("converts a local ontology JSON-LD file to CSV", async () => {
  const directory = await mkdtemp(join(tmpdir(), "uo-csv-"));

  try {
    const inputPath = join(directory, "20260101.jsonld");
    const outputPath = join(directory, "nested", "20260101.csv");
    await writeFile(
      inputPath,
      `${JSON.stringify(JSON_LD_DOCUMENT, null, 2)}\n`,
      "utf8",
    );

    const written = await convertJsonLdToCsv({
      inputPath,
      outputPath,
    });

    expect(written).toEqual({ outputPath, rowCount: 1 });
    expect(await readFile(outputPath)).toEqual(
      Buffer.from(EXPECTED_CSV, "utf8"),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("requires explicit JSON-LD input and CSV output paths", async () => {
  await expect(
    convertJsonLdToCsv({ outputPath: "output.csv" }),
  ).rejects.toThrow("inputPath is required.");
  await expect(
    convertJsonLdToCsv({ inputPath: "input.jsonld" }),
  ).rejects.toThrow("outputPath is required.");
});
