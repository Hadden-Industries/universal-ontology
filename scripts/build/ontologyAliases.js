import { readFile } from "node:fs/promises";
import { posix } from "node:path";

const DATED_VERSION = /^\d{8}$/u;
const ISO_IEC_ED_4_PREFIX =
  "https://haddenindustries.com/ontology/iso-iec/11179/-3/ed-4/";
const INTERNAL_IMPORT =
  /(<owl:imports\b[^>]*\brdf:resource\s*=\s*)(["'])(https:\/\/haddenindustries\.com\/ontology\/[^"']+)\2/gu;

function replaceTerminalVersion(url, aliasName) {
  const withoutTrailingSlash = url.endsWith("/") ? url.slice(0, -1) : url;
  const finalSeparator = withoutTrailingSlash.lastIndexOf("/");
  return `${withoutTrailingSlash.slice(0, finalSeparator + 1)}${aliasName}`;
}

function createUnstableAlias(stableBytes, outputPath) {
  let rewrittenImportCount = 0;
  const rewritten = stableBytes
    .toString("utf8")
    .replace(INTERNAL_IMPORT, (match, attributeStart, quote, url) => {
      rewrittenImportCount += 1;
      const aliasName = url.startsWith(ISO_IEC_ED_4_PREFIX)
        ? "latest"
        : "latest-unstable";
      return (
        `${attributeStart}${quote}` +
        `${replaceTerminalVersion(url, aliasName)}${quote}`
      );
    });

  if (rewrittenImportCount === 0) {
    throw new Error(
      `${outputPath}: no eligible internal owl:imports resources were found.`,
    );
  }

  return Buffer.from(rewritten, "utf8");
}

export async function generateOntologyAliases({ ontologySources }) {
  const candidatesByDirectory = new Map();

  for (const source of ontologySources) {
    const name = posix.basename(source.outputPath);

    if (!DATED_VERSION.test(name)) {
      continue;
    }

    const directory = posix.dirname(source.outputPath);
    const candidates = candidatesByDirectory.get(directory) ?? [];
    candidates.push({ ...source, name });
    candidatesByDirectory.set(directory, candidates);
  }

  const aliases = new Map();

  for (const directory of [...candidatesByDirectory.keys()].sort()) {
    const candidates = candidatesByDirectory
      .get(directory)
      .sort(({ name: left }, { name: right }) =>
        left < right ? -1 : left > right ? 1 : 0,
      );
    const selected = candidates.at(-1);
    const stablePath = posix.join(directory, "latest");
    const stableBytes = await readFile(selected.sourcePath);
    aliases.set(stablePath, stableBytes);

    if (directory === "universal" || directory.startsWith("universal/")) {
      const unstablePath = posix.join(directory, "latest-unstable");
      aliases.set(unstablePath, createUnstableAlias(stableBytes, unstablePath));
    }
  }

  return aliases;
}
