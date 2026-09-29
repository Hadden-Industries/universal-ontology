import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { DOMParser } from "@xmldom/xmldom";

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

/**
 * Converts OWL RDF/XML to UML XMI with the converter module loaded in Chrome.
 * @param {string} owlSource - The OWL RDF/XML source text.
 * @returns {Promise<string>} The serialised XMI.
 */
function convertInBrowser(owlSource) {
  return page.evaluate(async (xmlString) => {
    const { OwlToUmlXmiConverter } =
      await import("http://localhost/src/OwlToUmlXmiConverter.js");
    return new OwlToUmlXmiConverter(xmlString).convert();
  }, owlSource);
}

describe("OwlToUmlXmiConverter", () => {
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

    const xmi = await convertInBrowser(owlSource);
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

    const xmi = await convertInBrowser(owlSource);

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

    const xmi = await convertInBrowser(owlSource);
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

    const xmi = await convertInBrowser(owlSource);
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

    const xmi = await convertInBrowser(owlSource);
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
});
