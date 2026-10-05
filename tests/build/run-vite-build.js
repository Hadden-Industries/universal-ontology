import { build } from "vite";

import { createWebsiteConfig } from "../../scripts/build/createWebsiteConfig.js";

const [
  repositoryDirectory,
  sourceDirectory,
  outputDirectory,
  headPartialPath,
  failure,
] = process.argv.slice(2);

const config = await createWebsiteConfig({
  command: "build",
  mode: "production",
  repositoryDirectory,
  sourceDirectory,
  outputDirectory,
  headPartialPath,
});

if (failure === "fail-write")
  config.plugins.push({
    name: "fixture-failing-output-writer",
    writeBundle() {
      throw new Error("injected output failure");
    },
  });

await build({ ...config, configFile: false, logLevel: "silent" });
