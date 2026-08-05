import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DOMParser } from "@xmldom/xmldom";
import {
  transformOntologyToJsonLd,
  addRecordProperty,
  getPreferredLang,
} from "../src/ontology.js";




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

describe("Ontology Processor & Parser Test Suite", () => {
  describe("addRecordProperty", () => {
    it("should initialize multi-valued properties as an Array", () => {
      const record = {};
      addRecordProperty(record, "dcterms:source", "http://example.com/1", true);
      expect(Array.isArray(record["dcterms:source"])).toBe(true);
      expect(record["dcterms:source"]).toEqual(["http://example.com/1"]);
    });

    it("should safely handle mixing xml:lang literal objects and URI resource strings on multi-valued properties", () => {
      const record = {};
      // 1st child: language-tagged literal
      addRecordProperty(record, "dcterms:source", { en: "Source Reference Book" }, true);
      expect(Array.isArray(record["dcterms:source"])).toBe(true);
      expect(record["dcterms:source"]).toEqual([{ en: "Source Reference Book" }]);

      // 2nd child: URI resource (MUST NOT throw TypeError: record[key].includes is not a function)
      expect(() => {
        addRecordProperty(record, "dcterms:source", "http://example.com/ref2", true);
      }).not.toThrow();

      expect(record["dcterms:source"]).toEqual([
        { en: "Source Reference Book" },
        "http://example.com/ref2",
      ]);
    });

    it("should merge language keys for single-valued properties with multiple lang tags", () => {
      const record = {};
      addRecordProperty(record, "skos:prefLabel", { en: "English Label" }, false);
      addRecordProperty(record, "skos:prefLabel", { fr: "French Label" }, false);

      expect(record["skos:prefLabel"]).toEqual({
        en: "English Label",
        fr: "French Label",
      });
    });
  });

  describe("getPreferredLang", () => {
    it("should resolve language strings from language maps and arrays", () => {
      expect(getPreferredLang({ en: "Hello", fr: "Bonjour" })).toBe("Hello");
      expect(getPreferredLang([{ fr: "Bonjour" }, { en: "Hello" }])).toBe("Bonjour");
      expect(getPreferredLang("Plain String")).toBe("Plain String");
    });
  });

  describe("transformOntologyToJsonLd XML Parsing", () => {
    it("should parse XML with mixed lang and resource children without error", () => {
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/TestClass">
    <rdfs:label xml:lang="en">Test Class</rdfs:label>
    <dcterms:source xml:lang="en">Literal Source Title</dcterms:source>
    <dcterms:source rdf:resource="https://haddenindustries.com/ontology/ref/1"/>
  </owl:Class>
</rdf:RDF>`;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "application/xml");

      let jsonLd;
      expect(() => {
        jsonLd = transformOntologyToJsonLd(xmlDoc);
      }).not.toThrow();

      expect(jsonLd["@graph"]).toBeDefined();
      expect(jsonLd["@graph"].length).toBe(1);

      const item = jsonLd["@graph"][0];
      expect(item["@id"]).toBe("https://haddenindustries.com/ontology/universal/core/TestClass");
      expect(item["dcterms:source"]).toEqual([
        { en: "Literal Source Title" },
        "https://haddenindustries.com/ontology/ref/1",
      ]);
    });

    it("should parse full 20260714-full file without throwing TypeError", () => {
      const filePath = path.join(
        REPO_ROOT,
        "dist",
        "universal",
        "core",
        "20260714-full"
      );

      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}, skipping full file test.`);
        return;
      }

      const xmlText = fs.readFileSync(filePath, "utf8");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");

      let jsonLd;
      expect(() => {
        jsonLd = transformOntologyToJsonLd(xmlDoc);
      }).not.toThrow();

      expect(jsonLd["@graph"]).toBeDefined();
      expect(jsonLd["@graph"].length).toBeGreaterThan(0);
    });
  });
});
