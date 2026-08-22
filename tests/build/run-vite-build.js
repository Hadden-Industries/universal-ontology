import { build } from "vite";

import { createWebsiteConfig } from "../../scripts/build/createWebsiteConfig.js";

const [repositoryDirectory, sourceDirectory, outputDirectory, headPartialPath] =
  process.argv.slice(2);

const config = await createWebsiteConfig({
  command: "build",
  mode: "production",
  repositoryDirectory,
  sourceDirectory,
  outputDirectory,
  headPartialPath,
});

await build({ ...config, configFile: false, logLevel: "silent" });
