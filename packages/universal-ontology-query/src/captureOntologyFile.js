import { lstat, open, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, relative, parse, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
const maxBytes = 32 * 1024 * 1024;
const denied = () => new OntologyQueryError("ONTOLOGY_SOURCE_DENIED");
async function inspectSource(path, root) {
  const authority = root && (await lstat(root, { bigint: true }));
  let matched = !authority;
  const canonical = await realpath(path);
  if (relative(path, canonical) !== "") throw denied();
  // Check every ancestor, including the configured root. Recheck the opened
  // object's native identity against this path before returning the bytes.
  for (let part = path; ; part = dirname(part)) {
    const stat = await lstat(part, { bigint: true });
    if (stat.isSymbolicLink()) throw denied();
    if (
      authority &&
      stat.isDirectory() &&
      stat.ino &&
      stat.dev === authority.dev &&
      stat.ino === authority.ino
    )
      matched = true;
    if (part === parse(part).root) break;
  }
  if (!matched) throw denied();
  return lstat(path, { bigint: true });
}
async function readSource(path, root, byteLimit = maxBytes) {
  const before = await inspectSource(path, root);
  if (before.size > BigInt(byteLimit))
    throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
  if (!before.isFile() || !before.ino) throw denied();
  const fd = await open(
    path,
    constants.O_RDONLY |
      (constants.O_NOFOLLOW ?? 0) |
      (constants.O_NONBLOCK ?? 0),
  );
  try {
    const opened = await fd.stat({ bigint: true });
    const same = (s) =>
      s.isFile() &&
      s.dev === before.dev &&
      s.ino === before.ino &&
      s.size === before.size &&
      s.mtimeNs === before.mtimeNs &&
      s.ctimeNs === before.ctimeNs;
    if (!same(opened)) throw denied();
    const bytes = Buffer.alloc(Number(opened.size));
    let off = 0;
    while (off < bytes.length) {
      const { bytesRead } = await fd.read(
        bytes,
        off,
        Math.min(65536, bytes.length - off),
        off,
      );
      if (!bytesRead) throw denied();
      off += bytesRead;
    }
    if (
      !same(await fd.stat({ bigint: true })) ||
      !same(await inspectSource(path, root))
    )
      throw denied();
    return bytes;
  } finally {
    await fd.close();
  }
}

export async function captureOntologyFile({
  path,
  root,
  parsingMode,
  format,
  bindings = [],
  remainingSourceBytes = maxBytes,
  requireComplete = false,
}) {
  let remaining = Math.min(maxBytes, remainingSourceBytes);
  async function capture(path, authority, hint) {
    const bytes = await readSource(path, authority, remaining);
    remaining -= bytes.length;
    return {
      bytes,
      documentIRI: pathToFileURL(path).href,
      format:
        hint ?? (extname(path).toLowerCase() === ".ttl" ? "turtle" : "rdfxml"),
    };
  }
  try {
    if (bindings.length > 15)
      throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
    const source = await capture(path, root, format);
    const imports = bindings.map(({ iri, path: local, format: hint }) => ({
      importIRI: iri,
      documentIRI: pathToFileURL(local).href,
      async read() {
        try {
          return await capture(local, undefined, hint);
        } catch (error) {
          if (["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code))
            return undefined;
          if (error instanceof OntologyQueryError) throw error;
          throw new OntologyQueryError("ONTOLOGY_SOURCE_UNAVAILABLE");
        }
      },
    }));
    return { ...source, parsingMode, imports, requireComplete };
  } catch (error) {
    if (error instanceof OntologyQueryError) throw error;
    throw new OntologyQueryError("ONTOLOGY_SOURCE_UNAVAILABLE");
  }
}
