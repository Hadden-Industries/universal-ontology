import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";

import { resolveOutputPath } from "./sourceInventory.js";
import { createOntologyBuildAssets } from "./ontologyAssets.js";
import {
  beginFullOntologyBuild,
  completeFullOntologyBuild,
  endFullOntologyBuild,
  checkFullOntologyOutputPaths,
} from "./fullOntologyAssets.js";

function outputBytes(entry) {
  if (entry.type === "chunk") {
    return Buffer.from(entry.code, "utf8");
  }

  return typeof entry.source === "string"
    ? Buffer.from(entry.source, "utf8")
    : Buffer.from(entry.source);
}

export async function pruneUnchangedBundle({ bundle, outputDirectory }) {
  for (const [bundleKey, entry] of Object.entries(bundle)) {
    const destination = resolveOutputPath(outputDirectory, entry.fileName);

    try {
      const existing = await readFile(destination);

      if (existing.equals(outputBytes(entry))) {
        delete bundle[bundleKey];
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export function createContentAwareStaticCopyTargets({
  staticAssets,
  outputDirectory,
  command,
}) {
  return staticAssets.map(({ sourcePath, outputPath }) => {
    const destination = resolveOutputPath(outputDirectory, outputPath);

    return {
      src: sourcePath.replaceAll("\\", "/"),
      dest: posix.dirname(outputPath),
      rename: {
        stripBase: true,
        name: posix.basename(outputPath),
      },
      transform: {
        encoding: "buffer",
        async handler(content) {
          if (command !== "build") {
            return content;
          }

          try {
            const existing = await readFile(destination);
            return existing.equals(content) ? null : content;
          } catch (error) {
            if (error?.code === "ENOENT") {
              return content;
            }

            throw error;
          }
        },
      },
    };
  });
}

export function injectGlobalHead({ html, partial, filename }) {
  const openingHeads = [...html.matchAll(/<head(?:\s[^>]*)?>/giu)];
  const closingHeads = [...html.matchAll(/<\/head\s*>/giu)];

  if (
    openingHeads.length !== 1 ||
    closingHeads.length !== 1 ||
    openingHeads[0].index > closingHeads[0].index
  ) {
    throw new Error(`${filename} must contain exactly one <head> region.`);
  }

  const declaresIcon = (html.match(/<link\b[^>]*>/giu) ?? []).some((tag) => {
    const rel = tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu);
    const value = rel?.[1] ?? rel?.[2] ?? rel?.[3] ?? "";
    return value.toLowerCase().split(/\s+/u).includes("icon");
  });

  if (declaresIcon) {
    throw new Error(`${filename} already declares an icon link.`);
  }

  const closingHead = closingHeads[0].index;
  const closingHeadLine = html.lastIndexOf("\n", closingHead - 1) + 1;
  const closingHeadPrefix = html.slice(closingHeadLine, closingHead);
  const hasIndentedClosingHead = /^[\t ]*$/u.test(closingHeadPrefix);
  const insertionPoint = hasIndentedClosingHead ? closingHeadLine : closingHead;
  const indentation = hasIndentedClosingHead ? closingHeadPrefix : "";
  const leadingNewline = hasIndentedClosingHead ? "" : "\n";
  const indentedPartial = partial
    .split(/\r?\n/u)
    .map((line) => `${indentation}${line}`)
    .join("\n");

  return (
    `${html.slice(0, insertionPoint)}${leadingNewline}${indentedPartial}\n` +
    html.slice(insertionPoint)
  );
}

export function globalHeadPlugin({ partialPath }) {
  let partial;

  return {
    name: "universal-ontology-global-head",
    transformIndexHtml: {
      order: "post",
      async handler(html, context) {
        partial ??= (await readFile(partialPath, "utf8")).trimEnd();
        return injectGlobalHead({
          html,
          partial,
          filename: context.filename ?? "HTML entry",
        });
      },
    },
  };
}

export function ontologyAssetsPlugin({ ontologySources, fullOntologyContext }) {
  let state;
  let receipt;
  let writesCompleted = false;
  async function release() {
    if (!state) return;
    const owned = state;
    state = undefined;
    await endFullOntologyBuild(owned);
  }
  return {
    name: "universal-ontology-generated-assets",
    async buildStart() {
      writesCompleted = false;
      try {
        if (fullOntologyContext)
          state = await beginFullOntologyBuild(fullOntologyContext);
        const assets = await createOntologyBuildAssets({
          ontologySources,
          fullOntologyContext: fullOntologyContext
            ? {
                ...fullOntologyContext,
                onReceipt: (value) => {
                  receipt = value;
                },
              }
            : undefined,
        });
        if (fullOntologyContext)
          await checkFullOntologyOutputPaths(
            fullOntologyContext,
            assets.keys(),
          );
        for (const [fileName, source] of assets)
          this.emitFile({ type: "asset", fileName, source });
      } catch (error) {
        await release();
        throw error;
      }
    },
    async buildEnd(error) {
      if (error) await release();
    },
    // Vite calls close even when bundle.write fails. This ordered sentinel runs
    // only after the preceding output writers completed successfully.
    writeBundle: {
      order: "post",
      sequential: true,
      handler() {
        writesCompleted = true;
      },
    },
    closeBundle: {
      order: "post",
      sequential: true,
      async handler() {
        if (!state) return;
        try {
          if (writesCompleted) await completeFullOntologyBuild(state, receipt);
        } finally {
          await release();
        }
      },
    },
  };
}

export function outputCollisionPlugin({ reservedOutputPaths }) {
  return {
    name: "universal-ontology-output-collisions",
    generateBundle(_options, bundle) {
      for (const entry of Object.values(bundle)) {
        if (reservedOutputPaths.has(entry.fileName)) {
          throw new Error(
            `Vite output collides with a passthrough asset: ${entry.fileName}`,
          );
        }
      }
    },
  };
}

export function preserveUnchangedOutputPlugin({ outputDirectory }) {
  return {
    name: "universal-ontology-preserve-unchanged-output",
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        await pruneUnchangedBundle({ bundle, outputDirectory });
      },
    },
  };
}
