import { relative, resolve, sep } from "node:path";

import { viteStaticCopy } from "vite-plugin-static-copy";

import { inventorySourceTree } from "./sourceInventory.js";
import {
  createContentAwareStaticCopyTargets,
  globalHeadPlugin,
  ontologyAssetsPlugin,
  outputCollisionPlugin,
  preserveUnchangedOutputPlugin,
} from "./vitePlugins.js";

function pageName(sourceDirectory, htmlPath) {
  const relativePath = relative(sourceDirectory, htmlPath).split(sep).join("/");
  return relativePath.slice(0, -".html".length);
}

export async function createWebsiteConfig({
  command,
  mode,
  repositoryDirectory,
  sourceDirectory = resolve(repositoryDirectory, "src"),
  outputDirectory = resolve(repositoryDirectory, "dist"),
  headPartialPath = resolve(repositoryDirectory, "templates/head-icons.html"),
}) {
  const inventory = await inventorySourceTree({ sourceDirectory });
  const input = Object.fromEntries(
    inventory.htmlEntries.map((htmlPath) => [
      pageName(sourceDirectory, htmlPath),
      htmlPath,
    ]),
  );
  const staticCopyTargets = createContentAwareStaticCopyTargets({
    staticAssets: inventory.staticAssets,
    outputDirectory,
    command,
  });

  return {
    root: sourceDirectory,
    base: "/ontology/",
    publicDir: false,
    build: {
      outDir: outputDirectory,
      emptyOutDir: false,
      target: "es2022",
      minify: mode === "production" ? "terser" : false,
      cssMinify: mode === "production",
      sourcemap: false,
      rolldownOptions: {
        input,
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
      terserOptions: {
        format: { comments: false },
      },
    },
    plugins: [
      globalHeadPlugin({ partialPath: headPartialPath }),
      ontologyAssetsPlugin({ ontologySources: inventory.ontologySources }),
      ...viteStaticCopy({ targets: staticCopyTargets }),
      outputCollisionPlugin({
        reservedOutputPaths: new Set(
          inventory.staticAssets.map(({ outputPath }) => outputPath),
        ),
      }),
      preserveUnchangedOutputPlugin({ outputDirectory }),
    ],
  };
}
