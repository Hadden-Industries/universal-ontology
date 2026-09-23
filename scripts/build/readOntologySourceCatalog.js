import { createHash } from "node:crypto";
import { open, realpath, readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SaxesParser } from "@rubensworks/saxes";

/** Read exact uri/group/catalog directives only; never follow a network URL. */
export async function readOntologySourceCatalog({
  catalogPath,
  repositoryRoot,
}) {
  const root = await realpath(repositoryRoot);
  const absoluteCatalogPath = await realpath(catalogPath);
  const isContained = (path) => {
    const child = relative(root, path);
    return (
      child !== ".." &&
      !child.startsWith("../") &&
      !child.startsWith("..\\") &&
      !isAbsolute(child)
    );
  };
  if (!isContained(absoluteCatalogPath))
    throw new Error("Catalog escapes the repository.");
  const handle = await open(absoluteCatalogPath, "r");
  let bytes;
  try {
    if ((await handle.stat()).size > 65536)
      throw new RangeError("Catalog exceeds 64 KiB.");
    const buffer = Buffer.alloc(65537);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        size,
        buffer.length - size,
        null,
      );
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    if (size > 65536) throw new RangeError("Catalog exceeds 64 KiB.");
    bytes = buffer.subarray(0, size);
  } finally {
    await handle.close();
  }
  const bindings = new Map();
  const bases = [pathToFileURL(absoluteCatalogPath)];
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw new Error("Catalog DTDs are unsupported.");
  });
  parser.on("opentag", (tag) => {
    if (
      tag.uri !== "urn:oasis:names:tc:entity:xmlns:xml:catalog" ||
      !["catalog", "group", "uri"].includes(tag.local)
    )
      throw new Error(`Unsupported catalog directive: ${tag.local}`);
    if (bases.length > 32)
      throw new RangeError("Catalog nesting limit exceeded.");
    const base = tag.attributes["xml:base"]?.value;
    bases.push(base === undefined ? bases.at(-1) : new URL(base, bases.at(-1)));
    if (tag.local !== "uri") return;
    const name = tag.attributes.name?.value;
    const target = tag.attributes.uri?.value;
    if (!name || !target || !/^[a-z][a-z0-9+.-]*:/iu.test(name))
      throw new Error(
        "Catalog uri requires an absolute name and local target.",
      );
    const url = new URL(target, bases.at(-1));
    if (url.protocol !== "file:" || url.search || url.hash)
      throw new Error("Catalog target must be a local file.");
    const path = resolve(fileURLToPath(url));
    if (!isContained(path))
      throw new Error("Catalog target escapes the repository.");
    if (bindings.has(name) && bindings.get(name) !== path)
      throw new Error("Catalog binding is ambiguous.");
    bindings.set(name, path);
    if (bindings.size > 4096)
      throw new RangeError("Catalog binding limit exceeded.");
  });
  parser.on("closetag", () => bases.pop());
  parser.write(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).close();
  // Missing files remain resolvable names with an explicit generation coverage
  // gap. Existing paths must also pass native containment, including symlinks.
  for (const path of bindings.values()) {
    try {
      if (!isContained(await realpath(path)))
        throw new Error("Catalog target escapes the repository.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    bindings,
    sha256,
    async assertUnchanged() {
      if (
        createHash("sha256")
          .update(await readFile(absoluteCatalogPath))
          .digest("hex") !== sha256
      )
        throw new Error("Import catalog changed during generation.");
    },
  };
}
