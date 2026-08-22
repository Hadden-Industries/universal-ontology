import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

// Polyfill Node's global scope for the Node-side Verifier assertions
global.DOMParser = DOMParser;
global.XMLSerializer = XMLSerializer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_PARENT = path.join(__dirname, "..");

let browser;
let page;

beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  page = await browser.newPage();

  // Intercept the root URL and serve a blank HTML page
  await page.route("http://localhost/", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!DOCTYPE html><html><body></body></html>",
    });
  });

  // Intercept requests to serve local workspace files to the Chrome runtime
  await page.route("http://localhost/src/**/*", async (route) => {
    // Extract the path (e.g., /src/OwlToUmlXmiConverter.js) and normalise it for Windows
    const urlPath = new URL(route.request().url()).pathname;
    const relativePath = decodeURIComponent(urlPath.replace(/^\//, ""));
    const absolutePath = path.resolve(WORKSPACE_PARENT, relativePath);

    if (fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, "utf8");
      await route.fulfill({
        contentType: "application/javascript",
        body: content,
      });
    } else {
      await route.abort();
    }
  });

  // Navigate to the virtual domain to establish the origin
  await page.goto("http://localhost");
});

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

// 3. Your Test Runner Class (Decoupled)
export class TransformationVerifier {
  // Modified to accept the pre-computed string instead of the class instance
  static runSuite(testCases) {
    let passed = 0;
    const errors = [];

    for (const testCase of testCases) {
      try {
        // Compare the Chrome legacy output against the Chrome ES6 output natively in Node
        const isEquivalent = this.compareXmlTrees(
          testCase.legacyXmiTarget,
          testCase.actualXmiOutput,
        );

        if (isEquivalent) {
          passed++;
        } else {
          errors.push(
            `Test Case: ${testCase.name} - Structural mismatches detected.`,
          );
        }
      } catch (error) {
        errors.push(
          `Test Case: ${testCase.name} - Exception: ${error.message}`,
        );
      }
    }

    return { passed, total: testCases.length, errors };
  }

  static compareXmlTrees(xmlA, xmlB) {
    const parser = new DOMParser();
    const docA = parser.parseFromString(xmlA, "application/xml");
    const docB = parser.parseFromString(xmlB, "application/xml");

    if (
      docA.getElementsByTagName("parsererror").length > 0 ||
      docB.getElementsByTagName("parsererror").length > 0
    ) {
      return false;
    }

    return this.evaluateNodeEquivalence(
      docA.documentElement,
      docB.documentElement,
    );
  }

  static evaluateNodeEquivalence(nodeA, nodeB) {
    if (nodeA.nodeType !== nodeB.nodeType) return false;
    if (nodeA.localName !== nodeB.localName) return false;
    if (nodeA.namespaceURI !== nodeB.namespaceURI) return false;
    if (nodeA.nodeType === 3) {
      return nodeA.textContent.trim() === nodeB.textContent.trim();
    }

    if (nodeA.attributes.length !== nodeB.attributes.length) return false;

    for (let i = 0; i < nodeA.attributes.length; i++) {
      const attrA = nodeA.attributes[i];
      const attrB =
        nodeB.getAttributeNodeNS(attrA.namespaceURI, attrA.localName) ||
        nodeB.getAttributeNode(attrA.name);
      if (!attrB || attrA.value.trim() !== attrB.value.trim()) return false;
    }

    const childrenA = Array.from(nodeA.childNodes).filter(
      (n) =>
        n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim() !== ""),
    );
    const childrenB = Array.from(nodeB.childNodes).filter(
      (n) =>
        n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim() !== ""),
    );

    if (childrenA.length !== childrenB.length) return false;

    for (let i = 0; i < childrenA.length; i++) {
      if (!this.evaluateNodeEquivalence(childrenA[i], childrenB[i]))
        return false;
    }

    if (childrenA.length === 0 && nodeA.nodeType === 1) {
      if ((nodeA.textContent || "").trim() !== (nodeB.textContent || "").trim())
        return false;
    }

    return true;
  }
}

test("compares equivalent XML leaf text without throwing", () => {
  expect(
    TransformationVerifier.compareXmlTrees(
      "<root><value>same text</value></root>",
      "<root><value>same text</value></root>",
    ),
  ).toBe(true);
});

// 5. Standard Jest Execution Block
describe("XSLT to JavaScript Parity Test Suite", () => {
  const xsltString = fs.readFileSync(
    path.join(WORKSPACE_PARENT, "src", "owl-to-uml-xmi.xsl"),
    "utf8",
  );
  const mockOwlSource = fs.readFileSync(
    path.join(WORKSPACE_PARENT, "src", "universal", "core", "20260714"),
    "utf8",
  );

  it("emits a referenced class that has no local formal definition", async () => {
    const owlSource = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Defined">
    <rdfs:subClassOf rdf:resource="https://haddenindustries.com/ontology/universal/reference-data/Referenced" />
  </owl:Class>
</rdf:RDF>`;

    const xmi = await page.evaluate(async (xmlString) => {
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");
      return new OwlToUmlXmiConverter(xmlString).convert();
    }, owlSource);
    const xmiDocument = new DOMParser().parseFromString(xmi, "application/xml");
    const referencedClass = Array.from(
      xmiDocument.getElementsByTagName("packagedElement"),
    ).find((element) => element.getAttribute("xmi:id") === "urd:Referenced");

    expect(referencedClass?.getAttribute("xmi:type")).toBe("uml:Class");
    expect(referencedClass?.getAttribute("name")).toBe("Referenced");
  });

  it("replaces each fallback URI delimiter with one underscore", async () => {
    const owlSource = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Defined">
    <rdfs:subClassOf rdf:resource="http://example.com/classes#Referenced" />
  </owl:Class>
</rdf:RDF>`;

    const xmi = await page.evaluate(async (xmlString) => {
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");
      return new OwlToUmlXmiConverter(xmlString).convert();
    }, owlSource);

    expect(xmi).toContain('xmi:id="http___example_com_classes_Referenced"');
    expect(xmi).toContain('general="http___example_com_classes_Referenced"');
  });

  it("uses a UUID identifier even when another identifier appears first", async () => {
    const owlSource = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Activity">
    <dcterms:identifier rdf:resource="http://snomed.info/id/257733005" />
    <dcterms:identifier rdf:resource="urn:uuid:de266b65-ae3e-4fca-9d85-e131471584de" />
  </owl:Class>
</rdf:RDF>`;

    const xmi = await page.evaluate(async (xmlString) => {
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");
      return new OwlToUmlXmiConverter(xmlString).convert();
    }, owlSource);
    const xmiDocument = new DOMParser().parseFromString(xmi, "application/xml");
    const activityClass = Array.from(
      xmiDocument.getElementsByTagName("packagedElement"),
    ).find((element) => element.getAttribute("xmi:id") === "uc:Activity");

    expect(activityClass?.getAttribute("xmi:uuid")).toBe(
      "de266b65-ae3e-4fca-9d85-e131471584de",
    );
  });

  it("normalizes embedded XML whitespace in generated comments", async () => {
    const owlSource = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:owl="http://www.w3.org/2002/07/owl#"
  xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Quantity">
    <skos:example xml:lang="en">Length of a rod:
      5.34 m</skos:example>
  </owl:Class>
</rdf:RDF>`;

    const xmi = await page.evaluate(async (xmlString) => {
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");
      return new OwlToUmlXmiConverter(xmlString).convert();
    }, owlSource);
    const xmiDocument = new DOMParser().parseFromString(xmi, "application/xml");
    const body = xmiDocument.getElementsByTagName("body")[0]?.textContent;

    expect(body).toBe("EXAMPLE 1:\nLength of a rod: 5.34 m");
  });

  it("combines cardinalities split across multiple restrictions", async () => {
    const owlSource = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:ObjectProperty rdf:about="https://haddenindustries.com/ontology/universal/core/Provision_hasProduct">
    <rdfs:domain rdf:resource="https://haddenindustries.com/ontology/universal/core/Provision" />
    <rdfs:range rdf:resource="https://haddenindustries.com/ontology/universal/core/Product" />
  </owl:ObjectProperty>
  <owl:Class rdf:about="https://haddenindustries.com/ontology/universal/core/Provision">
    <rdfs:subClassOf>
      <owl:Restriction>
        <owl:onProperty rdf:resource="https://haddenindustries.com/ontology/universal/core/Provision_hasProduct" />
        <owl:minQualifiedCardinality>0</owl:minQualifiedCardinality>
      </owl:Restriction>
    </rdfs:subClassOf>
    <rdfs:subClassOf>
      <owl:Restriction>
        <owl:onProperty rdf:resource="https://haddenindustries.com/ontology/universal/core/Provision_hasProduct" />
        <owl:maxQualifiedCardinality>1</owl:maxQualifiedCardinality>
      </owl:Restriction>
    </rdfs:subClassOf>
  </owl:Class>
</rdf:RDF>`;

    const xmi = await page.evaluate(async (xmlString) => {
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");
      return new OwlToUmlXmiConverter(xmlString).convert();
    }, owlSource);
    const xmiDocument = new DOMParser().parseFromString(xmi, "application/xml");
    const property = Array.from(
      xmiDocument.getElementsByTagName("ownedAttribute"),
    ).find(
      (element) => element.getAttribute("xmi:id") === "uc:Provision_hasProduct",
    );

    expect(
      property?.getElementsByTagName("lowerValue")[0].getAttribute("value"),
    ).toBe("0");
    expect(
      property?.getElementsByTagName("upperValue")[0].getAttribute("value"),
    ).toBe("1");
  });

  it("generates equivalent XMI for the enterprise ontology", async () => {
    // Step A: Generate the legacy source of truth (Executes in Chrome)
    const expectedXmi = await page.evaluate(
      ({ xmlStr, xsltStr }) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
        const xsltDoc = parser.parseFromString(xsltStr, "application/xml");

        const processor = new window.XSLTProcessor();
        processor.importStylesheet(xsltDoc);

        const resultDoc = processor.transformToDocument(xmlDoc);
        const serializer = new XMLSerializer();
        return serializer.serializeToString(resultDoc);
      },
      { xmlStr: mockOwlSource, xsltStr: xsltString },
    );

    // Step B: Execute the new ES6 Converter natively (Executes in Chrome)
    const newJsResult = await page.evaluate(async (xmlStr) => {
      // Dynamically import the class via the Playwright router
      const { OwlToUmlXmiConverter } =
        await import("http://localhost/src/OwlToUmlXmiConverter.js");

      // Replicate the implementation format from your original runner
      const converter = new OwlToUmlXmiConverter(xmlStr);
      return converter.convert();
    }, mockOwlSource);

    // Step C: Set up the test cases with the evaluated strings
    const testCases = [
      {
        name: "Enterprise Schema Benchmark",
        owlSource: mockOwlSource,
        legacyXmiTarget: expectedXmi,
        actualXmiOutput: newJsResult,
      },
    ];

    // Step D: Run the verifier natively (Executes in Node using xmldom)
    const results = TransformationVerifier.runSuite(testCases);

    // Step E: Jest Assertions
    results.errors.forEach((err) => console.error(err));
    expect(results.errors).toHaveLength(0);
    expect(results.passed).toBe(results.total);
  });
});
