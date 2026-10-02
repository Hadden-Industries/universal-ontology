import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { IRI } from "owlapi/model";

const CATALOG_NAMESPACE = "urn:oasis:names:tc:entity:xmlns:xml:catalog";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const EXTERNAL_IDENTIFIER_ENTRIES = new Set([
  "public",
  "system",
  "rewriteSystem",
  "delegatePublic",
  "delegateSystem",
]);

// OASIS 1.0 section 6.3 requires escaping, not WHATWG URL equivalence:
// changing host case, dot segments, or existing percent escapes changes matching.
function normalizeReference(reference) {
  if (!reference.isWellFormed() || /%(?![0-9a-f]{2})/iu.test(reference)) {
    throw new Error(`Malformed catalog URI reference: ${reference}`);
  }
  return [...reference]
    .map((character) => {
      const code = character.codePointAt(0);
      return code <= 0x20 || code >= 0x7f || '<>"{}|\\^`'.includes(character)
        ? [...Buffer.from(character)]
            .map(
              (byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`,
            )
            .join("")
        : character;
    })
    .join("");
}

function attribute(element, name) {
  if (!element.hasAttribute(name) || !element.getAttribute(name)) {
    throw new Error(`Catalog ${element.localName} requires ${name}`);
  }
  return element.getAttribute(name);
}

function absoluteReference(reference, base) {
  return new URL(normalizeReference(reference), base).href;
}

async function loadLocalCatalog(iri) {
  const url = new URL(iri.value);
  if (url.protocol !== "file:")
    throw new Error(`Catalog loader requires file: URI: ${iri.value}`);
  return new TextDecoder("utf-8", { fatal: true }).decode(await readFile(url));
}

/** Compile URI catalogs without XML-parser I/O; resolve imports synchronously. */
export class OasisXmlCatalogIRIMapper {
  #catalog;

  constructor(catalog) {
    this.#catalog = catalog;
    Object.freeze(this);
  }

  /** Load the root and referenced catalogs, rejecting cycles and parse loss. */
  static async fromFile(
    catalogPath,
    { loadCatalogDocument = loadLocalCatalog } = {},
  ) {
    const root =
      catalogPath instanceof URL
        ? catalogPath.href
        : String(catalogPath).startsWith("file:")
          ? new URL(catalogPath).href
          : pathToFileURL(resolve(catalogPath)).href;
    const completed = new Map();
    async function compile(url, ancestors = []) {
      if (ancestors.includes(url))
        throw new Error(`Catalog cycle: ${[...ancestors, url].join(" -> ")}`);
      if (completed.has(url)) return completed.get(url);
      const xml = await loadCatalogDocument(IRI.create(url));
      if (/<!ENTITY\s/iu.test(xml))
        throw new Error("Catalog XML entity declarations are unsupported");
      const document = new DOMParser({
        onError: (_level, message) => {
          throw new Error(`Catalog XML: ${message}`);
        },
      }).parseFromString(xml, "application/xml");
      if (
        document.documentElement.namespaceURI !== CATALOG_NAMESPACE ||
        document.documentElement.localName !== "catalog"
      ) {
        throw new Error("Expected OASIS catalog root");
      }
      const exact = new Map();
      const rewrites = [];
      const delegates = [];
      const next = [];
      async function visit(element, inheritedBase) {
        if (element.namespaceURI !== CATALOG_NAMESPACE) return;
        const base = element.hasAttributeNS(XML_NAMESPACE, "base")
          ? absoluteReference(
              element.getAttributeNS(XML_NAMESPACE, "base"),
              inheritedBase,
            )
          : inheritedBase;
        const kind = element.localName;
        if (kind === "catalog" || kind === "group") {
          for (const child of element.childNodes) {
            if (child.nodeType === 1) await visit(child, base);
          }
        } else if (kind === "uri") {
          const name = normalizeReference(attribute(element, "name"));
          const target = absoluteReference(attribute(element, "uri"), base);
          if (exact.has(name) && exact.get(name) !== target)
            throw new Error(`Conflicting catalog URI mapping: ${name}`);
          exact.set(name, target);
        } else if (kind === "rewriteURI") {
          rewrites.push(
            Object.freeze({
              prefix: normalizeReference(attribute(element, "uriStartString")),
              target: absoluteReference(
                attribute(element, "rewritePrefix"),
                base,
              ),
            }),
          );
        } else if (kind === "delegateURI" || kind === "nextCatalog") {
          const target = absoluteReference(attribute(element, "catalog"), base);
          const catalog = await compile(target, [...ancestors, url]);
          if (kind === "nextCatalog") next.push(catalog);
          else
            delegates.push(
              Object.freeze({
                prefix: normalizeReference(
                  attribute(element, "uriStartString"),
                ),
                catalog,
              }),
            );
        } else if (!EXTERNAL_IDENTIFIER_ENTRIES.has(kind)) {
          throw new Error(`Unsupported OASIS catalog entry: ${kind}`);
        }
      }
      await visit(document.documentElement, url);
      // Stable sorting preserves authored order for equal-length prefixes.
      rewrites.sort((a, b) => b.prefix.length - a.prefix.length);
      delegates.sort((a, b) => b.prefix.length - a.prefix.length);
      const catalog = Object.freeze({
        exact,
        rewrites: Object.freeze(rewrites),
        delegates: Object.freeze(delegates),
        next: Object.freeze(next),
      });
      completed.set(url, catalog);
      return catalog;
    }
    return new OasisXmlCatalogIRIMapper(await compile(root));
  }

  /** Return the mapped document IRI, or undefined when the catalog has no match. */
  getDocumentIRI(ontologyIRI) {
    const reference = normalizeReference(ontologyIRI.value);
    const pending = [this.#catalog];
    while (pending.length) {
      const catalog = pending.shift();
      if (catalog.exact.has(reference))
        return IRI.create(catalog.exact.get(reference));
      const rewrite = catalog.rewrites.find((entry) =>
        reference.startsWith(entry.prefix),
      );
      if (rewrite)
        return IRI.create(
          rewrite.target + reference.slice(rewrite.prefix.length),
        );
      const delegates = catalog.delegates.filter((entry) =>
        reference.startsWith(entry.prefix),
      );
      if (delegates.length) {
        // Delegation replaces the whole current list, including pending siblings.
        pending.splice(
          0,
          pending.length,
          ...delegates.map((entry) => entry.catalog),
        );
      } else pending.unshift(...catalog.next);
    }
    return undefined;
  }
}

/** Find catalog-v001.xml starting at an input document's parent directory. */
export async function findCatalog(startPath) {
  let directory = dirname(
    startPath instanceof URL ? fileURLToPath(startPath) : resolve(startPath),
  );
  for (;;) {
    const candidate = resolve(directory, "catalog-v001.xml");
    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}
