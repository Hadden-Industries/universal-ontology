import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from 'playwright';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Polyfill Node's global scope for the Node-side Verifier assertions
global.DOMParser = DOMParser;
global.XMLSerializer = XMLSerializer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_PARENT = path.join(__dirname, '..');

let browser;
let page;

beforeAll(async () => {
    browser = await chromium.launch({
        headless: true,
        channel: 'chrome'
    });
    page = await browser.newPage();

    // Intercept the root URL and serve a blank HTML page
    await page.route('http://localhost/', async route => {
        await route.fulfill({
            contentType: 'text/html',
            body: '<!DOCTYPE html><html><body></body></html>'
        });
    });

    // Intercept requests to serve local workspace files to the Chrome runtime
    await page.route('http://localhost/src/**/*', async route => {
        // Extract the path (e.g., /src/OwlToUmlXmiConverter.js) and normalise it for Windows
        const urlPath = new URL(route.request().url()).pathname;
        const relativePath = decodeURIComponent(urlPath.replace(/^\//, ''));
        const absolutePath = path.resolve(WORKSPACE_PARENT, relativePath);

        if (fs.existsSync(absolutePath)) {
            const content = fs.readFileSync(absolutePath, 'utf8');
            await route.fulfill({
                contentType: 'application/javascript',
                body: content
            });
        } else {
            await route.abort();
        }
    });

    // Navigate to the virtual domain to establish the origin
    await page.goto('http://localhost');
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
                const isEquivalent = this.compareXmlTrees(testCase.legacyXmiTarget, testCase.actualXmiOutput);

                if (isEquivalent) {
                    passed++;
                } else {
                    errors.push(`Test Case: ${testCase.name} - Structural mismatches detected.`);
                }
            } catch (error) {
                errors.push(`Test Case: ${testCase.name} - Exception: ${error.message}`);
            }
        }

        return { passed, total: testCases.length, errors };
    }

    static compareXmlTrees(xmlA, xmlB) {
        const parser = new DOMParser();
        const docA = parser.parseFromString(xmlA, "application/xml");
        const docB = parser.parseFromString(xmlB, "application/xml");

        if (docA.getElementsByTagName("parsererror").length > 0 ||
            docB.getElementsByTagName("parsererror").length > 0) {
            return false;
        }

        return this.evaluateNodeEquivalence(docA.documentElement, docB.documentElement);
    }

    static evaluateNodeEquivalence(nodeA, nodeB) {
        if (nodeA.nodeType !== nodeB.nodeType) return false;
        if (nodeA.localName !== nodeB.localName) return false;
        if (nodeA.namespaceURI !== nodeB.namespaceURI) return false;

        if (nodeA.attributes.length !== nodeB.attributes.length) return false;

        for (let i = 0; i < nodeA.attributes.length; i++) {
            const attrA = nodeA.attributes[i];
            const attrB = nodeB.getAttributeNodeNS(attrA.namespaceURI, attrA.localName) ||
                          nodeB.getAttributeNode(attrA.name);
            if (!attrB || attrA.value.trim() !== attrB.value.trim()) return false;
        }

        const childrenA = Array.from(nodeA.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim() !== ''));
        const childrenB = Array.from(nodeB.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim() !== ''));

        if (childrenA.length !== childrenB.length) return false;

        for (let i = 0; i < childrenA.length; i++) {
            if (!this.evaluateNodeEquivalence(childrenA[i], childrenB[i])) return false;
        }

        if (childrenA.length === 0 && nodeA.nodeType === 1) {
            if ((nodeA.textContent || '').trim() !== (nodeB.textContent || '').trim()) return false;
        }

        return true;
    }
}

// 5. Standard Jest Execution Block
describe('XSLT to JavaScript Parity Test Suite', () => {

    const xsltString = fs.readFileSync(path.join(WORKSPACE_PARENT, 'src', 'owl-to-uml-xmi.xsl'), 'utf8');
    const mockOwlSource = fs.readFileSync(path.join(WORKSPACE_PARENT, 'src', 'universal', 'core', '20260714'), 'utf8');

    it('should generate equivalent XMI structures without polynomial latency', async () => {

        // Step A: Generate the legacy source of truth (Executes in Chrome)
        const expectedXmi = await page.evaluate(({ xmlStr, xsltStr }) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
            const xsltDoc = parser.parseFromString(xsltStr, 'application/xml');

            const processor = new window.XSLTProcessor();
            processor.importStylesheet(xsltDoc);

            const resultDoc = processor.transformToDocument(xmlDoc);
            const serializer = new XMLSerializer();
            return serializer.serializeToString(resultDoc);
        }, { xmlStr: mockOwlSource, xsltStr: xsltString });


        // Step B: Execute the new ES6 Converter natively (Executes in Chrome)
        const startTime = performance.now();

        const newJsResult = await page.evaluate(async (xmlStr) => {
            // Dynamically import the class via the Playwright router
            const { OwlToUmlXmiConverter } = await import('http://localhost/src/OwlToUmlXmiConverter.js');

            // Replicate the implementation format from your original runner
            const converter = new OwlToUmlXmiConverter(xmlStr);
            return converter.convert();
        }, mockOwlSource);

        const duration = performance.now() - startTime;


        // Step C: Set up the test cases with the evaluated strings
        const testCases = [{
            name: "Enterprise Schema Benchmark",
            owlSource: mockOwlSource,
            legacyXmiTarget: expectedXmi,
            actualXmiOutput: newJsResult
        }];

        // Step D: Run the verifier natively (Executes in Node using xmldom)
        const results = TransformationVerifier.runSuite(testCases);

        // Step E: Jest Assertions
        results.errors.forEach(err => console.error(err));
        expect(duration).toBeLessThan(50);
        expect(results.errors).toHaveLength(0);
        expect(results.passed).toBe(results.total);
    });
});
