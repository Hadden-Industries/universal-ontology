import { defineConfig } from "vite";

import { createWebsiteConfig } from "./scripts/build/createWebsiteConfig.js";

export default defineConfig(({ command, mode }) =>
  createWebsiteConfig({
    command,
    mode,
    repositoryDirectory: import.meta.dirname,
  }),
);
